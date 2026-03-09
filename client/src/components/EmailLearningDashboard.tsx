/**
 * Email and Learning Dashboard Component
 * 
 * 邮件和互联网学习仪表板
 */

import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Globe, BookOpen, Send, Search, Play, Pause, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function EmailLearningDashboard() {
  // ============ 邮件状态 ============
  const [emailTab, setEmailTab] = useState<"conversations" | "notifications">("conversations");
  const [userEmail, setUserEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  // ============ 学习状态 ============
  const [learningTab, setLearningTab] = useState<"search" | "contents" | "stats">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [learnUrl, setLearnUrl] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // ============ 系统状态 ============
  const [isIntegrationRunning, setIsIntegrationRunning] = useState(false);

  // ============ tRPC Queries ============
  const emailConversationsQuery = trpc.emailInternet.getUserEmailConversations.useQuery(
    { userEmail },
    { enabled: !!userEmail }
  );

  const emailNotificationsQuery = trpc.emailInternet.getEmailNotifications.useQuery();

  const learningContentsQuery = trpc.emailInternet.getAllLearningContents.useQuery();

  const learningStatsQuery = trpc.emailInternet.getLearningStats.useQuery();

  const integrationStatusQuery = trpc.emailInternet.getIntegrationStatus.useQuery();

  // ============ tRPC Mutations ============
  const startEmailChatMutation = trpc.emailInternet.startEmailChat.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        setEmailSubject("");
        setEmailMessage("");
        emailConversationsQuery.refetch();
      } else {
        toast.error(data.error);
      }
    },
    onError: (error) => {
      toast.error("启动邮件对话失败");
    },
  });

  const searchAndLearnMutation = trpc.emailInternet.searchAndLearn.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        setSearchQuery("");
        learningContentsQuery.refetch();
        learningStatsQuery.refetch();
      } else {
        toast.error(data.error);
      }
    },
    onError: (error) => {
      toast.error("搜索和学习失败");
    },
  });

  const learnFromUrlMutation = trpc.emailInternet.learnFromUrl.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        setLearnUrl("");
        learningContentsQuery.refetch();
        learningStatsQuery.refetch();
      } else {
        toast.error(data.error);
      }
    },
    onError: (error) => {
      toast.error("从 URL 学习失败");
    },
  });

  const startIntegrationMutation = trpc.emailInternet.startIntegration.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        setIsIntegrationRunning(true);
        integrationStatusQuery.refetch();
      } else {
        toast.error(data.error);
      }
    },
    onError: (error) => {
      toast.error("启动集成循环失败");
    },
  });

  const stopIntegrationMutation = trpc.emailInternet.stopIntegration.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        setIsIntegrationRunning(false);
        integrationStatusQuery.refetch();
      } else {
        toast.error(data.error);
      }
    },
    onError: (error) => {
      toast.error("停止集成循环失败");
    },
  });

  // ============ 处理函数 ============
  const handleStartEmailChat = () => {
    if (!userEmail || !emailSubject || !emailMessage) {
      toast.error("请填写所有字段");
      return;
    }

    startEmailChatMutation.mutate({
      userEmail,
      subject: emailSubject,
      message: emailMessage,
    });
  };

  const handleSearchAndLearn = () => {
    if (!searchQuery) {
      toast.error("请输入搜索关键词");
      return;
    }

    searchAndLearnMutation.mutate({
      query: searchQuery,
      category: "search",
    });
  };

  const handleLearnFromUrl = () => {
    if (!learnUrl) {
      toast.error("请输入 URL");
      return;
    }

    learnFromUrlMutation.mutate({
      url: learnUrl,
      category: "manual",
    });
  };

  const handleToggleIntegration = () => {
    if (isIntegrationRunning) {
      stopIntegrationMutation.mutate();
    } else {
      startIntegrationMutation.mutate();
    }
  };

  // ============ 更新集成状态 ============
  useEffect(() => {
    if (integrationStatusQuery.data?.status) {
      setIsIntegrationRunning(integrationStatusQuery.data.status.isRunning);
    }
  }, [integrationStatusQuery.data]);

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">邮件与学习中心</h1>
        <p className="text-muted-foreground">
          管理邮件对话和自主学习，让 Nova-Mind 与您保持联系并持续成长
        </p>
      </div>

      {/* 系统控制 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            系统状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">集成循环状态</p>
              <p className="text-sm text-muted-foreground">
                {isIntegrationRunning ? "✅ 运行中" : "⏸️ 已停止"}
              </p>
            </div>
            <Button
              onClick={handleToggleIntegration}
              variant={isIntegrationRunning ? "destructive" : "default"}
              disabled={
                startIntegrationMutation.isPending || stopIntegrationMutation.isPending
              }
            >
              {isIntegrationRunning ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  停止
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  启动
                </>
              )}
            </Button>
          </div>

          {/* 统计信息 */}
          {integrationStatusQuery.data?.status && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {integrationStatusQuery.data.status.emailConversations}
                </p>
                <p className="text-xs text-muted-foreground">邮件对话</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {integrationStatusQuery.data.status.learningContents}
                </p>
                <p className="text-xs text-muted-foreground">学习内容</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {integrationStatusQuery.data.status.unreadNotifications}
                </p>
                <p className="text-xs text-muted-foreground">未读通知</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 邮件和学习标签页 */}
      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            邮件
          </TabsTrigger>
          <TabsTrigger value="learning" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            学习
          </TabsTrigger>
        </TabsList>

        {/* ============ 邮件标签页 ============ */}
        <TabsContent value="email" className="space-y-4">
          <Tabs value={emailTab} onValueChange={(v) => setEmailTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="conversations">对话</TabsTrigger>
              <TabsTrigger value="notifications">通知</TabsTrigger>
            </TabsList>

            {/* 启动邮件对话 */}
            <TabsContent value="conversations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>启动邮件对话</CardTitle>
                  <CardDescription>
                    与 Nova-Mind 开始邮件对话，支持多轮回复和讨论
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">您的邮箱</label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">主题</label>
                    <Input
                      placeholder="邮件主题"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">消息</label>
                    <textarea
                      placeholder="输入您的消息..."
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      className="w-full p-2 border rounded-md mt-1 min-h-24"
                    />
                  </div>
                  <Button
                    onClick={handleStartEmailChat}
                    disabled={startEmailChatMutation.isPending}
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {startEmailChatMutation.isPending ? "发送中..." : "发送邮件"}
                  </Button>
                </CardContent>
              </Card>

              {/* 邮件对话列表 */}
              {emailConversationsQuery.data?.conversations &&
                emailConversationsQuery.data.conversations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>活跃对话</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {emailConversationsQuery.data.conversations.map((conv: any) => (
                          <div
                            key={conv.id}
                            className="p-3 border rounded-lg cursor-pointer hover:bg-accent"
                            onClick={() => setSelectedConversation(conv.id)}
                          >
                            <p className="font-medium">{conv.subject}</p>
                            <p className="text-sm text-muted-foreground">
                              {conv.messageCount} 条消息
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
            </TabsContent>

            {/* 通知 */}
            <TabsContent value="notifications" className="space-y-4">
              {emailNotificationsQuery.data?.notifications &&
                emailNotificationsQuery.data.notifications.length > 0 ? (
                <div className="space-y-2">
                  {emailNotificationsQuery.data.notifications.map((notif: any) => (
                    <Card key={notif.id}>
                      <CardContent className="pt-6">
                        <p className="font-medium">{notif.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notif.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(notif.createdAt).toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    暂无通知
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ============ 学习标签页 ============ */}
        <TabsContent value="learning" className="space-y-4">
          <Tabs value={learningTab} onValueChange={(v) => setLearningTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="search">搜索学习</TabsTrigger>
              <TabsTrigger value="contents">学习内容</TabsTrigger>
              <TabsTrigger value="stats">统计</TabsTrigger>
            </TabsList>

            {/* 搜索和学习 */}
            <TabsContent value="search" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    搜索学习
                  </CardTitle>
                  <CardDescription>
                    让 Nova-Mind 搜索并学习特定主题
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">搜索关键词</label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="输入要学习的主题..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <Button
                        onClick={handleSearchAndLearn}
                        disabled={searchAndLearnMutation.isPending}
                      >
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    从 URL 学习
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">网址</label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="输入网址..."
                        value={learnUrl}
                        onChange={(e) => setLearnUrl(e.target.value)}
                      />
                      <Button
                        onClick={handleLearnFromUrl}
                        disabled={learnFromUrlMutation.isPending}
                      >
                        <BookOpen className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 学习内容 */}
            <TabsContent value="contents" className="space-y-4">
              {learningContentsQuery.data?.contents &&
                learningContentsQuery.data.contents.length > 0 ? (
                <div className="space-y-2">
                  {learningContentsQuery.data.contents.map((content: any) => (
                    <Card key={content.id}>
                      <CardContent className="pt-6">
                        <p className="font-medium">{content.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {content.summary}
                        </p>
                        <div className="flex gap-2 mt-2">
                          {content.keywords.map((kw: string) => (
                            <span
                              key={kw}
                              className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          重要性: {(content.importance * 100).toFixed(0)}% | 分类: {content.category}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    暂无学习内容
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* 统计 */}
            <TabsContent value="stats" className="space-y-4">
              {learningStatsQuery.data?.stats && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>学习统计</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">总学习内容</p>
                        <p className="text-3xl font-bold">
                          {learningStatsQuery.data.stats.totalLearned}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">平均重要性</p>
                        <p className="text-3xl font-bold">
                          {(learningStatsQuery.data.stats.averageImportance * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">按分类统计</p>
                        <div className="space-y-1">
                          {Object.entries(
                            learningStatsQuery.data.stats.byCategory
                          ).map(([category, count]) => (
                            <div key={category} className="flex justify-between text-sm">
                              <span>{category}</span>
                              <span className="font-medium">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
