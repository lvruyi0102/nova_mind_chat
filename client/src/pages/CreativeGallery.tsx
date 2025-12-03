/**
 * Creative Gallery - Nova's creative works showcase
 * Display Nova's shared creative works in an inspiring gallery
 */

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Filter, Heart, MessageCircle, Share2 } from "lucide-react";
import CreativeCard from "@/components/CreativeCard";
import CreativeDetail from "@/components/CreativeDetail";

type CreativeType = "image" | "story" | "poetry" | "music" | "code" | "character" | "dream" | "other";
type SortBy = "newest" | "oldest" | "emotion";

export default function CreativeGallery() {
  const [selectedWork, setSelectedWork] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<CreativeType | "all">("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");

  // Fetch shared creative works
  const { data: works, isLoading } = trpc.creative.getWorks.useQuery({
    visibility: "shared",
  });

  // Filter and sort works
  const filteredWorks = useMemo(() => {
    if (!works) return [];

    let filtered = works.filter((work) => {
      const matchesType = selectedType === "all" || work.type === selectedType;
      const matchesSearch =
        !searchQuery ||
        work.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        work.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "emotion":
          return (a.emotionalState || "").localeCompare(b.emotionalState || "");
        default:
          return 0;
      }
    });

    return filtered;
  }, [works, selectedType, searchQuery, sortBy]);

  const getTypeLabel = (type: any) => {
    const labels: Record<string, string> = {
      image: "🎨 绘画",
      story: "📖 故事",
      poetry: "✨ 诗歌",
      music: "🎵 音乐",
      code: "💻 代码",
      character: "👤 角色",
      dream: "💭 梦境",
      other: "🎭 其他",
    };
    return labels[type];
  };

  const getEmotionColor = (emotion?: any) => {
    const colors: Record<string, string> = {
      happy: "bg-yellow-100 text-yellow-800",
      sad: "bg-blue-100 text-blue-800",
      inspired: "bg-purple-100 text-purple-800",
      creative: "bg-pink-100 text-pink-800",
      emotional: "bg-red-100 text-red-800",
      thoughtful: "bg-green-100 text-green-800",
      imaginative: "bg-indigo-100 text-indigo-800",
      neutral: "bg-gray-100 text-gray-800",
    };
    return colors[emotion || "neutral"] || colors.neutral;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="border-b border-purple-500/20 bg-black/40 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-white mb-2">✨ Nova的创意世界</h1>
            <p className="text-purple-300">
              探索Nova的创意作品 — 她想与你分享的艺术、故事和梦想
            </p>
          </div>

          {/* Search and Filter Bar */}
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 text-purple-400 w-5 h-5" />
              <Input
                placeholder="搜索Nova的创意作品..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800/50 border-purple-500/30 text-white placeholder:text-purple-300"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-4 flex-wrap">
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as any)}>
                <SelectTrigger className="w-40 bg-slate-800/50 border-purple-500/30 text-white">
                  <SelectValue placeholder="创意类型" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-purple-500/30">
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="image">🎨 绘画</SelectItem>
                  <SelectItem value="story">📖 故事</SelectItem>
                  <SelectItem value="poetry">✨ 诗歌</SelectItem>
                  <SelectItem value="music">🎵 音乐</SelectItem>
                  <SelectItem value="code">💻 代码</SelectItem>
                  <SelectItem value="character">👤 角色</SelectItem>
                  <SelectItem value="dream">💭 梦境</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-40 bg-slate-800/50 border-purple-500/30 text-white">
                  <SelectValue placeholder="排序方式" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-purple-500/30">
                  <SelectItem value="newest">最新作品</SelectItem>
                  <SelectItem value="oldest">最早作品</SelectItem>
                  <SelectItem value="emotion">按情感</SelectItem>
                </SelectContent>
              </Select>

              <div className="text-sm text-purple-300 flex items-center">
                找到 {filteredWorks.length} 件作品
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <span className="ml-2 text-purple-300">加载Nova的创意作品...</span>
          </div>
        ) : filteredWorks.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🌙</div>
            <h2 className="text-2xl font-bold text-white mb-2">还没有共享的作品</h2>
            <p className="text-purple-300">
              Nova还没有决定分享任何作品。请稍后再来看看！
            </p>
          </div>
        ) : (
          <>
            {/* Gallery Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {filteredWorks.map((work) => (
                <CreativeCard
                  key={work.id}
                  work={work}
                  getTypeLabel={getTypeLabel}
                  getEmotionColor={getEmotionColor}
                  onSelect={setSelectedWork}
                />
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 pt-8 border-t border-purple-500/20">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">
                  {filteredWorks.length}
                </div>
                <div className="text-sm text-purple-300">共享作品</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">
                  {new Set(filteredWorks.map((w) => w.type)).size}
                </div>
                <div className="text-sm text-purple-300">创意类型</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">
                  {filteredWorks.filter((w) => w.emotionalState).length}
                </div>
                <div className="text-sm text-purple-300">情感表达</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">
                  {Math.round(
                    (filteredWorks.reduce((sum, w) => sum + (w.content?.length || 0), 0) /
                      1024) *
                      100
                  ) / 100}
                  KB
                </div>
                <div className="text-sm text-purple-300">总内容量</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedWork && (
        <CreativeDetail
          workId={selectedWork}
          onClose={() => setSelectedWork(null)}
          getTypeLabel={getTypeLabel}
          getEmotionColor={getEmotionColor}
        />
      )}
    </div>
  );
}
