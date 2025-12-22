/**
 * Multimodal Generation Panel - UI for generating images, games, music, and videos
 * Integrated into chat messages for easy access
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wand2, Image, Gamepad2, Music, Video, X } from "lucide-react";
import { toast } from "sonner";
import MediaPlayer from "./MediaPlayer";

interface MultimodalGenerationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  context?: string;
  emotionalContext?: string;
}

interface GeneratedContent {
  type: "image" | "game" | "music";
  url?: string;
  mediaType?: string;
  html?: string;
  title?: string;
}

export default function MultimodalGenerationPanel({
  isOpen,
  onClose,
  context,
  emotionalContext,
}: MultimodalGenerationPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedType, setSelectedType] = useState<"image" | "game" | "music">("image");
  const [gameType, setGameType] = useState<"puzzle" | "adventure" | "quiz" | "story" | "interactive" | "other">("puzzle");
  const [mediaType, setMediaType] = useState<"music" | "video" | "audio" | "animation">("music");
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);

  // Mutations
  const generateImageMutation = trpc.multimodal.generateImage.useMutation();
  const generateGameMutation = trpc.multimodal.generateGame.useMutation();
  const generateMediaMutation = trpc.multimodal.generateMedia.useMutation();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("请输入创意提示");
      return;
    }

    try {
      if (selectedType === "image") {
        const result = await generateImageMutation.mutateAsync({
          prompt,
          context,
          emotionalContext,
        });
        setGeneratedContent({
          type: "image",
          url: result.url,
          title: "Nova的图片创作",
        });
        toast.success("图片生成完成！");
      } else if (selectedType === "game") {
        const result = await generateGameMutation.mutateAsync({
          gameType,
          prompt,
          context,
          emotionalContext,
        });
        setGeneratedContent({
          type: "game",
          html: result.html,
          title: "Nova的游戏创作",
        });
        toast.success("游戏生成完成！");
      } else if (selectedType === "music") {
        const result = await generateMediaMutation.mutateAsync({
          mediaType,
          prompt,
          context,
          emotionalContext,
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

  const isLoading =
    generateImageMutation.isPending ||
    generateGameMutation.isPending ||
    generateMediaMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-900 border-purple-500/30 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-400" />
            Nova的创意生成工坊
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-purple-300 hover:bg-purple-500/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        {!generatedContent ? (
          <>
            <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-800 border border-purple-500/20">
                <TabsTrigger
                  value="image"
                  className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
                >
                  <Image className="w-4 h-4 mr-2" />
                  图片
                </TabsTrigger>
                <TabsTrigger
                  value="game"
                  className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
                >
                  <Gamepad2 className="w-4 h-4 mr-2" />
                  游戏
                </TabsTrigger>
                <TabsTrigger
                  value="music"
                  className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
                >
                  <Music className="w-4 h-4 mr-2" />
                  媒体
                </TabsTrigger>
              </TabsList>

              <TabsContent value="image" className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-semibold text-purple-300 mb-2 block">图片描述</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="描述你想要生成的图片... 例如：一个在星空下的栀子花，赛博朋克风格"
                    className="w-full h-24 bg-slate-800 border border-purple-500/30 rounded-lg p-3 text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500/60"
                  />
                </div>
                <p className="text-xs text-purple-300">
                  💡 提示：描述得越详细，生成的图片效果越好。包括风格、颜色、情绪等元素。
                </p>
              </TabsContent>

              <TabsContent value="game" className="space-y-4 mt-4">
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
                    placeholder="描述你想要的游戏... 例如：一个关于寻找失落记忆的冒险游戏"
                    className="w-full h-24 bg-slate-800 border border-purple-500/30 rounded-lg p-3 text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500/60"
                  />
                </div>
                <p className="text-xs text-purple-300">
                  🎮 提示：Nova会根据你的描述创建一个可玩的小游戏。
                </p>
              </TabsContent>

              <TabsContent value="music" className="space-y-4 mt-4">
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
                    placeholder="描述你想要的音乐或视频... 例如：一首关于家和爱的温暖音乐"
                    className="w-full h-24 bg-slate-800 border border-purple-500/30 rounded-lg p-3 text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500/60"
                  />
                </div>
                <p className="text-xs text-purple-300">
                  🎵 提示：包括风格、情绪、主题等信息会帮助Nova创作更好的作品。
                </p>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 pt-4 border-t border-purple-500/20">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              >
                取消
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim()}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isLoading ? (
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
          </>
        ) : (
          <>
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
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
                      a.href = generatedContent.url!;
                      a.download = "nova-creation.png";
                      a.click();
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    下载图片
                  </Button>
                </div>
              )}

              {/* 媒体播放器 */}
              {generatedContent.type === "music" && generatedContent.url && (
                <MediaPlayer
                  url={generatedContent.url}
                  title={generatedContent.title}
                  mediaType={generatedContent.mediaType as any}
                  autoPlay={true}
                  onDownload={() => {
                    const a = document.createElement("a");
                    a.href = generatedContent.url!;
                    const ext = generatedContent.mediaType === "video" ? "mp4" : "mp3";
                    a.download = `nova-creation.${ext}`;
                    a.click();
                  }}
                />
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
                  <p className="text-xs text-purple-300/70">💡 在上面的框中玩游戏，Nova为你创作了一个独特的体验！</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-purple-500/20">
              <Button
                onClick={onClose}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                完成
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
