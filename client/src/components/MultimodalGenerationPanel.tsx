// @ts-ignore - Type mismatches with tRPC routes
/**
 * Multimodal Generation Panel - Simple modal for generating images, games, music, and videos
 * Mounted at app root level to avoid DOM tree issues
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2, Image, Gamepad2, Music, X } from "lucide-react";
import { toast } from "sonner";
import { useGeneration } from "@/contexts/GenerationContext";

export default function MultimodalGenerationPanel() {
  const { isOpen, closePanel, context, emotionalContext } = useGeneration();
  const [prompt, setPrompt] = useState("");
  const [selectedType, setSelectedType] = useState<"image" | "game" | "music">("image");
  const [gameType, setGameType] = useState<"puzzle" | "adventure" | "quiz" | "story" | "interactive" | "other">("puzzle");
  const [mediaType, setMediaType] = useState<"music" | "video" | "audio" | "animation">("music");
  const [generatedContent, setGeneratedContent] = useState<any>(null);

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

  const handleClose = () => {
    setGeneratedContent(null);
    setPrompt("");
    closePanel();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-purple-500/30 rounded-lg shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20 flex-shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-400" />
            Nova的创意生成工坊
          </h2>
          <button
            onClick={handleClose}
            className="text-purple-300 hover:bg-purple-500/10 p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {!generatedContent ? (
            <div className="space-y-4">
              {/* Type Selection */}
              <div className="flex gap-2 border-b border-purple-500/20 pb-4">
                <button
                  onClick={() => setSelectedType("image")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    selectedType === "image"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/50"
                      : "text-purple-300/60 hover:bg-purple-500/10"
                  }`}
                >
                  <Image className="w-4 h-4" />
                  图片
                </button>
                <button
                  onClick={() => setSelectedType("game")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    selectedType === "game"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/50"
                      : "text-purple-300/60 hover:bg-purple-500/10"
                  }`}
                >
                  <Gamepad2 className="w-4 h-4" />
                  游戏
                </button>
                <button
                  onClick={() => setSelectedType("music")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    selectedType === "music"
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
                {selectedType === "image" && (
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

                {selectedType === "game" && (
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

                {selectedType === "music" && (
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
                  onClick={handleClose}
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
            </div>
          )}
        </div>

        {/* Footer - only show when viewing results */}
        {generatedContent && (
          <div className="flex gap-2 p-6 border-t border-purple-500/20 flex-shrink-0">
            <Button
              onClick={handleClose}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              完成
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
