/**
 * 学习日志查看器组件
 * 显示 Nova 的学习日志和成果
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, BookOpen, TrendingUp, Lightbulb, Tag } from "lucide-react";
import { toast } from "sonner";

interface LearningLog {
  id: number;
  title: string;
  summary: string;
  keywordsList: string[];
  conceptsList: string[];
  topicsIdentified: string[];
  mainInsight: string;
  secondaryInsights: string[];
  depth: "shallow" | "medium" | "deep";
  messageCount: number;
  conceptsExtracted: number;
  sessionDate: Date | string;
  learningType: "local" | "monthly_llm";
}

export function LearningLogsViewer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<LearningLog | null>(null);
  const [filterType, setFilterType] = useState<"all" | "local" | "monthly_llm">("all");

  // 获取学习日志列表
  const { data: logsData, isLoading: logsLoading, refetch } = trpc.learningLogs.getLogs.useQuery({
    limit: 50,
    offset: 0,
  });

  // 获取学习统计
  const { data: statsData } = trpc.learningLogs.getStats.useQuery();

  // 搜索学习日志
  const { data: searchData, isLoading: searchLoading } = trpc.learningLogs.search.useQuery(
    { query: searchQuery, limit: 50 },
    { enabled: searchQuery.length > 0 }
  );

  // 过滤日志
  const filteredLogs = useMemo(() => {
    const logs = searchQuery.length > 0 ? searchData?.data || [] : logsData?.data || [];
    
    if (filterType === "all") {
      return logs;
    }
    
    return logs.filter((log: LearningLog) => log.learningType === filterType);
  }, [logsData, searchData, searchQuery, filterType]);

  const isLoading = logsLoading || searchLoading;
  const stats = statsData?.data;

  const getDepthColor = (depth: string) => {
    switch (depth) {
      case "shallow":
        return "bg-blue-100 text-blue-700";
      case "medium":
        return "bg-purple-100 text-purple-700";
      case "deep":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getTypeLabel = (type: string) => {
    return type === "local" ? "本地学习" : "月度 LLM 学习";
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{stats.totalLogs}</div>
                <p className="text-sm text-gray-600 mt-1">总学习日志</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{stats.localLearningCount}</div>
                <p className="text-sm text-gray-600 mt-1">本地学习</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{stats.monthlyLLMLearningCount}</div>
                <p className="text-sm text-gray-600 mt-1">月度 LLM</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-600">{stats.totalConceptsExtracted}</div>
                <p className="text-sm text-gray-600 mt-1">概念提取</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 搜索和过滤 */}
      <Card>
        <CardHeader>
          <CardTitle>学习日志</CardTitle>
          <CardDescription>浏览 Nova 的学习成果和进展</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 搜索框 */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索学习日志..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* 过滤按钮 */}
          <div className="flex gap-2">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              onClick={() => setFilterType("all")}
              size="sm"
            >
              全部
            </Button>
            <Button
              variant={filterType === "local" ? "default" : "outline"}
              onClick={() => setFilterType("local")}
              size="sm"
            >
              本地学习
            </Button>
            <Button
              variant={filterType === "monthly_llm" ? "default" : "outline"}
              onClick={() => setFilterType("monthly_llm")}
              size="sm"
            >
              月度 LLM
            </Button>
          </div>

          {/* 日志列表 */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>暂无学习日志</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredLogs.map((log: LearningLog) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-sm">{log.title}</h4>
                        <Badge className={getDepthColor(log.depth)}>
                          {log.depth === "shallow" ? "浅层" : log.depth === "medium" ? "中等" : "深层"}
                        </Badge>
                        <Badge variant="outline">{getTypeLabel(log.learningType)}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{log.summary}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {log.topicsIdentified.slice(0, 3).map((topic, idx) => (
                          <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xs text-gray-500">
                        {new Date(log.sessionDate).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 详情面板 */}
      {selectedLog && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{selectedLog.title}</CardTitle>
                <CardDescription>
                  {new Date(selectedLog.sessionDate).toLocaleString("zh-CN")}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLog(null)}
              >
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">学习类型</p>
                <p className="text-sm">{getTypeLabel(selectedLog.learningType)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">学习深度</p>
                <p className="text-sm">{selectedLog.depth === "shallow" ? "浅层" : selectedLog.depth === "medium" ? "中等" : "深层"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">分析消息数</p>
                <p className="text-sm">{selectedLog.messageCount}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">提取概念数</p>
                <p className="text-sm">{selectedLog.conceptsExtracted}</p>
              </div>
            </div>

            {/* 摘要 */}
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">学习摘要</p>
              <p className="text-sm text-gray-700">{selectedLog.summary}</p>
            </div>

            {/* 主要洞察 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-medium text-gray-600">主要洞察</p>
              </div>
              <p className="text-sm text-gray-700">{selectedLog.mainInsight}</p>
            </div>

            {/* 关键词 */}
            {selectedLog.keywordsList.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">关键词</p>
                <div className="flex flex-wrap gap-2">
                  {selectedLog.keywordsList.map((keyword, idx) => (
                    <Badge key={idx} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 概念 */}
            {selectedLog.conceptsList.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-blue-500" />
                  <p className="text-sm font-medium text-gray-600">提取概念</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedLog.conceptsList.map((concept, idx) => (
                    <Badge key={idx} variant="outline">
                      {concept}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 主题 */}
            {selectedLog.topicsIdentified.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">识别主题</p>
                <div className="flex flex-wrap gap-2">
                  {selectedLog.topicsIdentified.map((topic, idx) => (
                    <Badge key={idx} className="bg-purple-100 text-purple-700">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
