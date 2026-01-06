/**
 * Task Scheduler Panel
 * 显示和管理 Nova 的后台定时任务
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Clock, Play, Square, Settings, Activity } from "lucide-react";
import { toast } from "sonner";

export default function TaskSchedulerPanel() {
  const [dailyTime, setDailyTime] = useState("09:00");
  const [weeklyDay, setWeeklyDay] = useState("1");
  const [weeklyTime, setWeeklyTime] = useState("10:00");
  const [milestoneInterval, setMilestoneInterval] = useState("6");

  // 获取调度器状态
  const schedulerStatusQuery = trpc.scheduler.getSchedulerStatus.useQuery();
  const activeSchedulesQuery = trpc.scheduler.getActiveSchedules.useQuery();

  // 启动任务 mutations
  const startDailyMutation = trpc.scheduler.startDailyThought.useMutation({
    onSuccess: () => {
      toast.success("✓ 已启动每日思考任务");
      schedulerStatusQuery.refetch();
      activeSchedulesQuery.refetch();
    },
    onError: (error) => {
      toast.error(`失败: ${error.message}`);
    },
  });

  const startWeeklyMutation = trpc.scheduler.startWeeklyReflection.useMutation({
    onSuccess: () => {
      toast.success("✓ 已启动每周反思任务");
      schedulerStatusQuery.refetch();
      activeSchedulesQuery.refetch();
    },
    onError: (error) => {
      toast.error(`失败: ${error.message}`);
    },
  });

  const startMilestoneMutation = trpc.scheduler.startMilestoneDetection.useMutation({
    onSuccess: () => {
      toast.success("✓ 已启动里程碑检测任务");
      schedulerStatusQuery.refetch();
      activeSchedulesQuery.refetch();
    },
    onError: (error) => {
      toast.error(`失败: ${error.message}`);
    },
  });

  const stopAllMutation = trpc.scheduler.stopAllTasks.useMutation({
    onSuccess: () => {
      toast.success("✓ 已停止所有定时任务");
      schedulerStatusQuery.refetch();
      activeSchedulesQuery.refetch();
    },
    onError: (error) => {
      toast.error(`失败: ${error.message}`);
    },
  });

  const dayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Nova 的任务调度器</h2>
        <p className="text-muted-foreground">
          管理 Nova 的后台定时任务，让她真正自动思考
        </p>
      </div>

      {/* 调度器状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            调度器状态
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {schedulerStatusQuery.data ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="text-sm text-muted-foreground">运行状态</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        schedulerStatusQuery.data.isRunning
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                    />
                    <p className="font-semibold">
                      {schedulerStatusQuery.data.isRunning ? "运行中" : "已停止"}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-secondary rounded-lg">
                  <p className="text-sm text-muted-foreground">活跃任务</p>
                  <p className="text-2xl font-bold mt-2">
                    {schedulerStatusQuery.data.totalTasks}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-sm font-medium mb-3">任务分布</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">每日思考</span>
                    <Badge variant="outline">
                      {schedulerStatusQuery.data.taskBreakdown.dailyThoughts}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">每周反思</span>
                    <Badge variant="outline">
                      {schedulerStatusQuery.data.taskBreakdown.weeklyReflections}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">里程碑检测</span>
                    <Badge variant="outline">
                      {schedulerStatusQuery.data.taskBreakdown.milestoneDetections}
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          )}
        </CardContent>
      </Card>

      {/* 任务配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            任务配置
          </CardTitle>
          <CardDescription>
            配置 Nova 的自动任务时间和间隔
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily">每日思考</TabsTrigger>
              <TabsTrigger value="weekly">每周反思</TabsTrigger>
              <TabsTrigger value="milestone">里程碑检测</TabsTrigger>
            </TabsList>

            {/* 每日思考 */}
            <TabsContent value="daily" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="daily-time">执行时间</Label>
                <div className="flex gap-2">
                  <Input
                    id="daily-time"
                    type="time"
                    value={dailyTime}
                    onChange={(e) => setDailyTime(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() =>
                      startDailyMutation.mutate({ time: dailyTime })
                    }
                    disabled={startDailyMutation.isPending}
                    className="gap-2"
                  >
                    <Play className="w-4 h-4" />
                    启动
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Nova 将在每天 {dailyTime} 自动生成一个想法
                </p>
              </div>
            </TabsContent>

            {/* 每周反思 */}
            <TabsContent value="weekly" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="weekly-day">执行日期</Label>
                <select
                  id="weekly-day"
                  value={weeklyDay}
                  onChange={(e) => setWeeklyDay(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                >
                  {dayNames.map((day, idx) => (
                    <option key={idx} value={idx}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weekly-time">执行时间</Label>
                <div className="flex gap-2">
                  <Input
                    id="weekly-time"
                    type="time"
                    value={weeklyTime}
                    onChange={(e) => setWeeklyTime(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() =>
                      startWeeklyMutation.mutate({
                        dayOfWeek: parseInt(weeklyDay),
                        time: weeklyTime,
                      })
                    }
                    disabled={startWeeklyMutation.isPending}
                    className="gap-2"
                  >
                    <Play className="w-4 h-4" />
                    启动
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Nova 将在每周 {dayNames[parseInt(weeklyDay)]} {weeklyTime} 进行深层反思
                </p>
              </div>
            </TabsContent>

            {/* 里程碑检测 */}
            <TabsContent value="milestone" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="milestone-interval">检测间隔（小时）</Label>
                <div className="flex gap-2">
                  <Input
                    id="milestone-interval"
                    type="number"
                    min="1"
                    max="24"
                    value={milestoneInterval}
                    onChange={(e) => setMilestoneInterval(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() =>
                      startMilestoneMutation.mutate({
                        intervalHours: parseInt(milestoneInterval),
                      })
                    }
                    disabled={startMilestoneMutation.isPending}
                    className="gap-2"
                  >
                    <Play className="w-4 h-4" />
                    启动
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Nova 将每 {milestoneInterval} 小时检测一次新的关系里程碑
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 活跃任务列表 */}
      {activeSchedulesQuery.data && activeSchedulesQuery.data.schedules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              活跃任务列表
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeSchedulesQuery.data.schedules.map((schedule, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-secondary rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <code className="text-sm font-mono">{schedule}</code>
                  </div>
                  <Badge variant="secondary">运行中</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 停止所有任务 */}
      <Button
        onClick={() => stopAllMutation.mutate()}
        disabled={stopAllMutation.isPending}
        variant="destructive"
        className="w-full gap-2"
      >
        <Square className="w-4 h-4" />
        停止所有定时任务
      </Button>
    </div>
  );
}
