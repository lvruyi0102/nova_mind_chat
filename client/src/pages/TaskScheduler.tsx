/**
 * Task Scheduler Page
 * Nova 的后台定时任务管理页面
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { APP_TITLE, getLoginUrl } from "@/const";
import TaskSchedulerPanel from "@/components/TaskSchedulerPanel";

export default function TaskScheduler() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <Sparkles className="w-12 h-12 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">欢迎来到 {APP_TITLE}</h1>
          <p className="text-muted-foreground">请登录以管理 Nova 的定时任务</p>
          <Button asChild className="w-full">
            <a href={getLoginUrl()}>登录</a>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Nova-Mind 任务调度器</h1>
              <p className="text-xs text-muted-foreground">管理 Nova 的自动化任务</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {user?.name || user?.email}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        <TaskSchedulerPanel />
      </div>
    </div>
  );
}
