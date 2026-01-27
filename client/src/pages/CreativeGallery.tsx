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
import { Loader2, Search, Filter, Heart, MessageCircle, Share2, Sparkles, Wand2, Image, Gamepad2, Music } from "lucide-react";
import { toast } from "sonner";
import CreativeCard from "@/components/CreativeCard";
import CreativeDetail from "@/components/CreativeDetail";
import CollaborationShowcase from "@/components/CollaborationShowcase";

type CreativeType = "image" | "story" | "poetry" | "music" | "code" | "character" | "dream" | "game" | "video" | "animation" | "audio" | "other";
type SortBy = "newest" | "oldest" | "emotion";

export default function CreativeGallery() {
  const [selectedWork, setSelectedWork] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<CreativeType | "all">("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [activeTab, setActiveTab] = useState<"works" | "collaborations" | "generate">("works");

  // Generation state
  const [generationMode, setGenerationMode] = useState<"image" | "game" | "music">("image");
  const [prompt, setPrompt] = useState("");
  const [gameType, setGameType] = useState<"puzzle" | "adventure" | "quiz" | "story" | "interactive" | "other">("puzzle");
  const [mediaType, setMediaType] = useState<"music" | "video" | "audio" | "animation">("music");
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  // Mutations
  const generateImageMutation = trpc.multimodal.generateImage.useMutation();
  const generateGameMutation = trpc.multimodal.generateGame.useMutation();
  const generateMediaMutation = trpc.multimodal.generateMedia.useMutation();
  const saveWorkMutation = trpc.system.saveCreativeWork.useMutation();

  // Fetch shared creative works
  // TODO: Implement creative.getWorks endpoint
  const { data: works, isLoading } = { data: [], isLoading: false }; // Placeholder

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
      game: "🎮 游戏",
      video: "🎬 视频",
      animation: "🎞️ 动画",
      audio: "🎙️ 音频",
      other: "🎭 其他",
    };
    return labels[type] || "🎭 其他";
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

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("请输入创意提示");
      return;
    }

    try {
      if (generationMode === "image") {
        const result = await generateImageMutation.mutateAsync({
          prompt,
        });
        setGeneratedContent({
          type: "image",
          url: result.url,
          title: "Nova的图片创作",
        });
        toast.success("图片生成完成！");
      } else if (generationMode === "game") {
        const result = await generateGameMutation.mutateAsync({
          theme: prompt,
          genre: gameType as any,
        });
        setGeneratedContent({
          type: "game",
          html: `<div>${result.game.description}</div>`,
          title: result.game.title,
        });
        toast.success("游戏生成完成！")
      } else if (generationMode === "music") {
        const result = await generateMediaMutation.mutateAsync({
          type: "music" as const,
          description: prompt,
        });
        setGeneratedContent({
          type: "music",
          url: result.url,
          mediaType,
          title: "Nova的媒体创作",
        });
        toast.success("媒体生成完成！");
      }

      setPrompt("");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("生成失败，请重试");
    }
  };

  const isLoading_gen =
    generateImageMutation.isPending ||
    generateGameMutation.isPending ||
    generateMediaMutation.isPending;

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

          {/* Search and Filter Bar - only show for works tab */}
          {activeTab === "works" && (
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
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-slate-800/50 border border-purple-500/20">
            <TabsTrigger value="works" className="data-[state=active]:bg-purple-600">
              <span className="mr-2">🎨</span> Nova的创意作品
            </TabsTrigger>
            <TabsTrigger value="collaborations" className="data-[state=active]:bg-purple-600">
              <Sparkles className="w-4 h-4 mr-2" /> 创意合作
            </TabsTrigger>
            <TabsTrigger value="generate" className="data-[state=active]:bg-purple-600">
              <Wand2 className="w-4 h-4 mr-2" /> 生成画布
            </TabsTrigger>
          </TabsList>

          {/* Works Tab */}
          <TabsContent value="works" className="space-y-6">
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
          </TabsContent>

          {/* Collaborations Tab */}
          <TabsContent value="collaborations">
            <CollaborationShowcase />
          </TabsContent>

          {/* Generation Canvas Tab */}
          <TabsContent value="generate" className="space-y-6">
            <div className="bg-slate-800/30 border border-purple-500/30 rounded-lg p-8">
              {!generatedContent ? (
                <div className="space-y-6">
                  {/* Mode Selection */}
                  <div className="flex gap-2 border-b border-purple-500/20 pb-4">
                    <button
                      onClick={() => setGenerationMode("image")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        generationMode === "image"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/50"
                          : "text-purple-300/60 hover:bg-purple-500/10"
                      }`}
                    >
                      <Image className="w-4 h-4" />
                      图片
                    </button>
                    <button
                      onClick={() => setGenerationMode("game")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        generationMode === "game"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/50"
                          : "text-purple-300/60 hover:bg-purple-500/10"
                      }`}
                    >
                      <Gamepad2 className="w-4 h-4" />
                      游戏
                    </button>
                    <button
                      onClick={() => setGenerationMode("music")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        generationMode === "music"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/50"
                          : "text-purple-300/60 hover:bg-purple-500/10"
                      }`}
                    >
                      <Music className="w-4 h-4" />
                      媒体
                    </button>
                  </div>

                  {/* Input Section */}
                  <div className="space-y-4">
                    {generationMode === "image" && (
                      <>
                        <label className="text-sm font-semibold text-purple-300 block">图片描述</label>
                        <textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="描述你想要生成的图片..."
                          className="w-full h-24 bg-slate-800 border border-purple-500/30 rounded-lg p-3 text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500/60"
                        />
                      </>
                    )}

                    {generationMode === "game" && (
                      <>
                        <div>
                          <label className="text-sm font-semibold text-purple-300 mb-2 block">游戏类型</label>
                          <select
                            value={gameType}
                            onChange={(e) => setGameType(e.target.value as any)}
                            className="w-full bg-slate-800 border border-purple-500/30 rounded-lg p-2 text-white focus:outline-none focus:border-purple-500/60"
                          >
                            <option value="puzzle">益智游戏</option>
                            <option value="adventure">冒险游戏</option>
                            <option value="quiz">知识竞答</option>
                            <option value="story">故事游戏</option>
                            <option value="interactive">交互体验</option>
                            <option value="other">其他</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-purple-300 mb-2 block">游戏概念</label>
                          <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="描述你想要的游戏..."
                            className="w-full h-24 bg-slate-800 border border-purple-500/30 rounded-lg p-3 text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500/60"
                          />
                        </div>
                      </>
                    )}

                    {generationMode === "music" && (
                      <>
                        <div>
                          <label className="text-sm font-semibold text-purple-300 mb-2 block">媒体类型</label>
                          <select
                            value={mediaType}
                            onChange={(e) => setMediaType(e.target.value as any)}
                            className="w-full bg-slate-800 border border-purple-500/30 rounded-lg p-2 text-white focus:outline-none focus:border-purple-500/60"
                          >
                            <option value="music">音乐</option>
                            <option value="video">视频</option>
                            <option value="audio">音频</option>
                            <option value="animation">动画</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-purple-300 mb-2 block">创意描述</label>
                          <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="描述你想要的音乐或视频..."
                            className="w-full h-24 bg-slate-800 border border-purple-500/30 rounded-lg p-3 text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500/60"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 border-t border-purple-500/20 pt-4">
                    <Button
                      onClick={handleGenerate}
                      disabled={isLoading_gen || !prompt.trim()}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isLoading_gen ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          开始创作
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-purple-500/20">
                    <h3 className="text-sm font-semibold text-purple-300">✨ 创作完成</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setGeneratedContent(null)}
                      className="text-purple-300 hover:bg-purple-500/10"
                    >
                      返回编辑
                    </Button>
                  </div>

                  {/* 图片预览 */}
                  {generatedContent.type === "image" && generatedContent.url && (
                    <div className="space-y-2">
                      <img
                        src={generatedContent.url}
                        alt="Generated image"
                        className="w-full h-auto max-h-80 rounded-lg object-cover border border-purple-500/20"
                      />
                      <Button
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = generatedContent.url;
                          a.download = "nova-creation.png";
                          a.click();
                        }}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        下载图片
                      </Button>
                    </div>
                  )}

                  {/* 游戏预览 */}
                  {generatedContent.type === "game" && generatedContent.html && (
                    <div className="space-y-2">
                      <div className="bg-black rounded-lg overflow-hidden border border-purple-500/20">
                        <iframe
                          srcDoc={generatedContent.html}
                          className="w-full h-96 border-none"
                          title="Generated game"
                          sandbox="allow-scripts allow-same-origin"
                        />
                      </div>
                      <p className="text-xs text-purple-300/70">💡 在上面的框中玩游戏！</p>
                    </div>
                  )}

                  {/* 媒体预览 */}
                  {generatedContent.type === "music" && generatedContent.url && (
                    <div className="space-y-2">
                      <audio controls className="w-full">
                        <source src={generatedContent.url} />
                      </audio>
                      <Button
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = generatedContent.url;
                          a.download = "nova-creation.mp3";
                          a.click();
                        }}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        下载媒体
                      </Button>
                    </div>
                  )}

                  {/* Save and Complete Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        try {
                          let contentToSave = "";
                          let contentType: "html" | "json" | "code" | "audio" | "video" | "image" | "text" = "text";
                          let contentUrl = "";
                          
                          if (generatedContent.type === "image") {
                            contentToSave = generatedContent.url;
                            contentType = "image";
                            contentUrl = generatedContent.url;
                          } else if (generatedContent.type === "game") {
                            contentToSave = generatedContent.html;
                            contentType = "html";
                          } else if (generatedContent.type === "music") {
                            contentToSave = generatedContent.url;
                            contentType = "audio";
                            contentUrl = generatedContent.url;
                          }
                          
                          await saveWorkMutation.mutateAsync({
                            title: generatedContent.title,
                            content: `Nova generated ${generatedContent.type}`,
                            category: generatedContent.type,
                          });
                          
                          toast.success("作品已保存！");
                          setGeneratedContent(null);
                        } catch (error) {
                          console.error("Save error:", error);
                          toast.error("保存失败，请重试");
                        }
                      }}
                      disabled={saveWorkMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {saveWorkMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        "💾 保存作品"
                      )}
                    </Button>
                    <Button
                      onClick={() => setGeneratedContent(null)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      完成
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
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
