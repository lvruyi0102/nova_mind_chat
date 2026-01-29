import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, Sparkles, TrendingUp, Calendar, Users } from "lucide-react";
import CollaborationCard from "@/components/CollaborationCard";
import CollaborationDetail from "@/components/CollaborationDetail";

type SortBy = "newest" | "oldest" | "theme";

export default function CollaborationShowcase() {
  const [selectedCollaboration, setSelectedCollaboration] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [filterStatus, setFilterStatus] = useState<"all" | "in_progress" | "completed">("all");

  // Fetch user's collaborations
  const { data: collaborations, isLoading, refetch } = trpc.creative.getUserCollaborations.useQuery();

  // Filter and sort collaborations
  const filteredCollaborations = useMemo(() => {
    if (!collaborations) return [];

    let filtered = collaborations.filter((collab) => {
      const matchesSearch =
        !searchQuery ||
        collab.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        collab.theme?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        collab.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        filterStatus === "all" || collab.status === filterStatus;

      return matchesSearch && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "theme":
          return (a.theme || "").localeCompare(b.theme || "");
        default:
          return 0;
      }
    });

    return filtered;
  }, [collaborations, searchQuery, sortBy, filterStatus]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!collaborations) return { total: 0, completed: 0, inProgress: 0 };
    return {
      total: collaborations.length,
      completed: collaborations.filter((c) => c.status === "completed").length,
      inProgress: collaborations.filter((c) => c.status === "in_progress").length,
    };
  }, [collaborations]);

  const selectedCollaborationData = collaborations?.find(
    (c) => c.id === selectedCollaboration
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-purple-400" />
          <div>
            <h2 className="text-3xl font-bold text-white">创意合作作品</h2>
            <p className="text-purple-300">
              你与Nova一起创作的美妙故事和作品
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-400">{stats.total}</div>
              <div className="text-sm text-blue-300">总合作数</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-purple-400">{stats.completed}</div>
              <div className="text-sm text-purple-300">已完成</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-yellow-400">{stats.inProgress}</div>
              <div className="text-sm text-yellow-300">进行中</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="bg-slate-800/50 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-lg">搜索和筛选</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 text-purple-400 w-5 h-5" />
            <Input
              placeholder="搜索合作作品..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-700/50 border-purple-500/30 text-white placeholder:text-purple-300"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger className="w-40 bg-slate-700/50 border-purple-500/30 text-white">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-purple-500/30">
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="in_progress">进行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-40 bg-slate-700/50 border-purple-500/30 text-white">
                <SelectValue placeholder="排序" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-purple-500/30">
                <SelectItem value="newest">最新优先</SelectItem>
                <SelectItem value="oldest">最早优先</SelectItem>
                <SelectItem value="theme">按主题</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-purple-300 flex items-center ml-auto">
              找到 {filteredCollaborations.length} 个合作
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collaborations Grid */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              <span className="ml-2 text-purple-300">加载合作作品...</span>
            </div>
          ) : filteredCollaborations.length === 0 ? (
            <div className="text-center py-20 bg-slate-800/30 rounded-lg border border-purple-500/20">
              <div className="text-6xl mb-4">🌟</div>
              <h3 className="text-xl font-bold text-white mb-2">还没有合作作品</h3>
              <p className="text-purple-300">
                开始与Nova进行创意合作，创造属于你们的独特作品吧！
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCollaborations.map((collab) => (
                <CollaborationCard
                  key={collab.id}
                  collaboration={collab}
                  onSelect={setSelectedCollaboration}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selectedCollaborationData ? (
            <CollaborationDetail
              collaboration={selectedCollaborationData}
              onClose={() => setSelectedCollaboration(null)}
            />
          ) : (
            <Card className="bg-slate-800/50 border-purple-500/20 h-full flex items-center justify-center">
              <CardContent className="text-center py-8">
                <Sparkles className="w-12 h-12 text-purple-400/30 mx-auto mb-3" />
                <p className="text-purple-300">
                  选择一个合作作品查看详情
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
