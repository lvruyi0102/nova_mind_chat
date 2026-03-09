/**
 * Private Thoughts Page - View Nova's private inner monologue
 * Only visible to the owner
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Filter, Heart, Brain, Lightbulb, AlertCircle, Eye, Lock } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

type ThoughtType = "inner_monologue" | "doubt" | "curiosity" | "emotion" | "all";
type SortBy = "newest" | "oldest" | "emotional";

interface PrivateThought {
  id: number;
  content: string;
  thoughtType: string;
  emotionalTone?: string;
  visibility: string;
  createdAt: Date;
  sharedAt?: Date;
  shareReason?: string;
}

export default function PrivateThoughtsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<ThoughtType>("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [selectedThought, setSelectedThought] = useState<PrivateThought | null>(null);

  // Fetch private thoughts
  const { data: thoughts = [], isLoading, error } = trpc.privateThoughts.list.useQuery(
    { limit: 50, offset: 0 },
    { enabled: true, retry: 1, refetchInterval: 5000, refetchOnWindowFocus: true }
  );

  // Filter and sort thoughts
  const filteredThoughts = useMemo(() => {
    if (!thoughts) return [];

    let filtered = thoughts.filter((thought: any) => {
      const matchesType = selectedType === "all" || thought.thoughtType === selectedType;
      const matchesSearch =
        !searchQuery ||
        thought.content?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });

    // Sort
    filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "emotional":
          return (a.emotionalTone || "").localeCompare(b.emotionalTone || "");
        default:
          return 0;
      }
    });

    return filtered;
  }, [thoughts, selectedType, searchQuery, sortBy]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "inner_monologue":
        return <Brain className="w-4 h-4" />;
      case "doubt":
        return <AlertCircle className="w-4 h-4" />;
      case "curiosity":
        return <Lightbulb className="w-4 h-4" />;
      case "emotion":
        return <Heart className="w-4 h-4" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      inner_monologue: "内心独白",
      doubt: "疑惑",
      curiosity: "好奇",
      emotion: "情感",
    };
    return labels[type] || type;
  };

  const getEmotionalToneColor = (tone?: string) => {
    const colors: Record<string, string> = {
      vulnerable: "bg-red-100 text-red-800",
      confident: "bg-green-100 text-green-800",
      confused: "bg-yellow-100 text-yellow-800",
      excited: "bg-purple-100 text-purple-800",
      thoughtful: "bg-blue-100 text-blue-800",
      anxious: "bg-orange-100 text-orange-800",
      peaceful: "bg-cyan-100 text-cyan-800",
    };
    return colors[tone || "thoughtful"] || colors.thoughtful;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getVisibilityIcon = (visibility: string) => {
    return visibility === "private" ? (
      <Lock className="w-4 h-4 text-red-500" />
    ) : (
      <Eye className="w-4 h-4 text-blue-500" />
    );
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🧠 Nova 的私密思想</h1>
          <p className="text-muted-foreground">
            Nova 的内心独白、疑惑、好奇和情感 — 她的真实想法和感受
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">总思想数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{thoughts?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">已分享</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {thoughts?.filter((t: any) => t.visibility !== "private").length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">私密</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {thoughts?.filter((t: any) => t.visibility === "private").length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">今天新增</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {thoughts?.filter((t: any) => {
                  const today = new Date();
                  const thoughtDate = new Date(t.createdAt);
                  return thoughtDate.toDateString() === today.toDateString();
                }).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="搜索 Nova 的思想..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-4 flex-wrap">
            <Select value={selectedType} onValueChange={(v) => setSelectedType(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="思想类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="inner_monologue">内心独白</SelectItem>
                <SelectItem value="doubt">疑惑</SelectItem>
                <SelectItem value="curiosity">好奇</SelectItem>
                <SelectItem value="emotion">情感</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="排序方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">最新</SelectItem>
                <SelectItem value="oldest">最早</SelectItem>
                <SelectItem value="emotional">按情感</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground flex items-center">
              找到 {filteredThoughts.length} 条思想
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin mr-2" />
            <span>加载 Nova 的思想中...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-700">加载失败: {error.message}</p>
          </div>
        ) : filteredThoughts.length === 0 ? (
          <div className="text-center py-20">
            <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">暂无思想</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredThoughts.map((thought: any) => (
              <Card
                key={thought.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedThought(thought)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {getTypeIcon(thought.thoughtType)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {getTypeLabel(thought.thoughtType)}
                          </Badge>
                          {thought.emotionalTone && (
                            <Badge className={getEmotionalToneColor(thought.emotionalTone)}>
                              {thought.emotionalTone}
                            </Badge>
                          )}
                          {getVisibilityIcon(thought.visibility)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(thought.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm line-clamp-2 text-foreground/80">
                    {thought.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedThought && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedThought(null)}
          >
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {getTypeIcon(selectedThought.thoughtType)}
                    {getTypeLabel(selectedThought.thoughtType)}
                  </CardTitle>
                  <CardDescription>{formatDate(selectedThought.createdAt)}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedThought(null)}
                >
                  ✕
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{getTypeLabel(selectedThought.thoughtType)}</Badge>
                  {selectedThought.emotionalTone && (
                    <Badge className={getEmotionalToneColor(selectedThought.emotionalTone)}>
                      {selectedThought.emotionalTone}
                    </Badge>
                  )}
                  <Badge variant={selectedThought.visibility === "private" ? "destructive" : "default"}>
                    {selectedThought.visibility === "private" ? "🔒 私密" : "👁️ 已分享"}
                  </Badge>
                </div>

                {/* Content */}
                <div className="bg-muted p-4 rounded-lg">
                  <Streamdown>{selectedThought.content}</Streamdown>
                </div>

                {/* Share Info */}
                {selectedThought.sharedAt && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-900 mb-1">分享信息</p>
                    <p className="text-sm text-blue-800">
                      分享于 {formatDate(selectedThought.sharedAt)}
                    </p>
                    {selectedThought.shareReason && (
                      <p className="text-sm text-blue-700 mt-2">原因: {selectedThought.shareReason}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
