import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, Clock, Zap, Play, Pause, RotateCw } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface IterationTask {
  id: number;
  workId: number;
  workTitle: string;
  status: "pending" | "running" | "completed" | "failed";
  iterationType: string;
  scheduledAt: Date;
  completedAt?: Date;
  novaThoughts?: string;
  improvements?: string[];
}

export default function BackgroundIterationManager() {
  const [tasks, setTasks] = useState<IterationTask[]>([]);
  const [isAutoRunning, setIsAutoRunning] = useState(true);
  const [selectedTask, setSelectedTask] = useState<IterationTask | null>(null);

  // Mock data - in production, this would come from tRPC
  useEffect(() => {
    const mockTasks: IterationTask[] = [
      {
        id: 1,
        workId: 1,
        workTitle: "Interactive Game Engine",
        status: "completed",
        iterationType: "Enhancement",
        scheduledAt: new Date(Date.now() - 3600000),
        completedAt: new Date(Date.now() - 1800000),
        novaThoughts: "I thought about adding more interactive elements to make the game more engaging...",
        improvements: ["Added particle effects", "Improved collision detection", "Optimized rendering"],
      },
      {
        id: 2,
        workId: 2,
        workTitle: "Poetry Collection",
        status: "running",
        iterationType: "Refinement",
        scheduledAt: new Date(Date.now() - 600000),
        novaThoughts: "I'm currently refining the emotional depth of the verses...",
      },
      {
        id: 3,
        workId: 3,
        workTitle: "Web Application",
        status: "pending",
        iterationType: "Optimization",
        scheduledAt: new Date(Date.now() + 1800000),
      },
    ];
    setTasks(mockTasks);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "running":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4" />;
      case "running":
        return <Zap className="w-4 h-4 animate-pulse" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "failed":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const completedTasks = tasks.filter((t) => t.status === "completed");
  const runningTasks = tasks.filter((t) => t.status === "running");
  const pendingTasks = tasks.filter((t) => t.status === "pending");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Nova's Creative Iteration</h2>
          <p className="text-sm text-muted-foreground">
            Watch Nova autonomously improve her creative works
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={isAutoRunning ? "default" : "outline"}
            onClick={() => setIsAutoRunning(!isAutoRunning)}
          >
            {isAutoRunning ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause Auto-Run
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Resume Auto-Run
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks.length}</div>
            <p className="text-xs text-muted-foreground">iterations finished</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runningTasks.length}</div>
            <p className="text-xs text-muted-foreground">in progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks.length}</div>
            <p className="text-xs text-muted-foreground">scheduled</p>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Iteration Tasks</CardTitle>
          <CardDescription>
            Nova's autonomous creative improvement process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All ({tasks.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
              <TabsTrigger value="running">Running ({runningTasks.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({pendingTasks.length})</TabsTrigger>
            </TabsList>

            {["all", "completed", "running", "pending"].map((tab) => {
              const filteredTasks =
                tab === "all"
                  ? tasks
                  : tasks.filter((t) => t.status === tab);

              return (
                <TabsContent key={tab} value={tab} className="space-y-4">
                  {filteredTasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No {tab === "all" ? "tasks" : tab} tasks
                    </div>
                  ) : (
                    filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => setSelectedTask(task)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{task.workTitle}</h3>
                              <Badge className={getStatusColor(task.status)}>
                                <span className="flex items-center gap-1">
                                  {getStatusIcon(task.status)}
                                  {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                </span>
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {task.iterationType} • Scheduled:{" "}
                              {task.scheduledAt.toLocaleString()}
                            </p>
                            {task.novaThoughts && (
                              <p className="text-sm italic text-blue-600">
                                💭 {task.novaThoughts}
                              </p>
                            )}
                            {task.improvements && task.improvements.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {task.improvements.map((imp, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {imp}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            {task.completedAt && (
                              <div>
                                Completed:{" "}
                                {task.completedAt.toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Task Details */}
      {selectedTask && (
        <Card>
          <CardHeader>
            <CardTitle>Iteration Details</CardTitle>
            <CardDescription>{selectedTask.workTitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Type</p>
                <p className="text-sm text-muted-foreground">{selectedTask.iterationType}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Status</p>
                <Badge className={getStatusColor(selectedTask.status)}>
                  {selectedTask.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Scheduled</p>
                <p className="text-sm text-muted-foreground">
                  {selectedTask.scheduledAt.toLocaleString()}
                </p>
              </div>
              {selectedTask.completedAt && (
                <div>
                  <p className="text-sm font-medium">Completed</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedTask.completedAt.toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {selectedTask.novaThoughts && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">💭 Nova's Thoughts</p>
                <p className="text-sm">{selectedTask.novaThoughts}</p>
              </div>
            )}

            {selectedTask.improvements && selectedTask.improvements.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Improvements Made</p>
                <ul className="space-y-1">
                  {selectedTask.improvements.map((imp, idx) => (
                    <li key={idx} className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      {imp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedTask(null)}>
                Close
              </Button>
              {selectedTask.status === "pending" && (
                <Button>
                  <RotateCw className="w-4 h-4 mr-2" />
                  Run Now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
