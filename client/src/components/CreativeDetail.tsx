/**
 * Creative Detail - Detailed view of a creative work
 */

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { CreativeWork } from "@/types/creative";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, X, Heart, Share2, Copy, Download } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

interface CreativeDetailProps {
  workId: number;
  onClose: () => void;
  getTypeLabel: (type: string) => string;
  getEmotionColor: (emotion?: string) => string;
}

export default function CreativeDetail({
  workId,
  onClose,
  getTypeLabel,
  getEmotionColor,
}: CreativeDetailProps) {
  const [liked, setLiked] = useState(false);
  const { data: work, isLoading, error } = trpc.creative.getWorkDetail.useQuery({ workId });

  const handleCopy = () => {
    if (work?.content) {
      navigator.clipboard.writeText(work.content);
      toast.success("已复制到剪贴板");
    }
  };

  const handleDownload = () => {
    if (work?.content && work.type !== "image") {
      const element = document.createElement("a");
      element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(work.content));
      element.setAttribute("download", `${work.title || "nova-creation"}.txt`);
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success("已下载");
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMetadata = () => {
    try {
      if (typeof work?.metadata === "string") {
        return JSON.parse(work.metadata);
      }
      return work?.metadata || {};
    } catch {
      return {};
    }
  };

  const metadata = getMetadata();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-purple-500/30">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-white">{work?.title || "Nova的创意作品"}</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-purple-300 hover:bg-purple-500/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          {isLoading ? (
            <div className="bg-slate-800/50 rounded-lg p-8 flex items-center justify-center min-h-64">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
                <p className="text-purple-300">加载作品详情中...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-slate-800/50 rounded-lg p-8 flex items-center justify-center min-h-64">
              <div className="text-center">
                <p className="text-red-400">加载失败: {error.message}</p>
              </div>
            </div>
          ) : work ? (
            <>
              {/* Image Preview for image type */}
              {work.type === "image" && work.content && (
                <div className="bg-slate-800/50 rounded-lg p-4 flex items-center justify-center">
                  <img
                    src={work.content}
                    alt={work.title}
                    className="max-w-full max-h-96 rounded-lg"
                  />
                </div>
              )}

              {/* Content Display */}
              {work.type !== "image" && work.content && (
                <div className="bg-slate-800/50 rounded-lg p-6 border border-purple-500/20">
                  <div className="max-h-96 overflow-y-auto">
                    <Streamdown>{work.content}</Streamdown>
                  </div>
                </div>
              )}

              {/* Description */}
              {work.description && (
                <div>
                  <h3 className="text-sm font-semibold text-purple-300 mb-2">描述</h3>
                  <p className="text-purple-200">{work.description}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-purple-300 mb-2">创意类型</h3>
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    {getTypeLabel(work.type)}
                  </Badge>
                </div>

                {work.emotionalState && (
                  <div>
                    <h3 className="text-sm font-semibold text-purple-300 mb-2">情感状态</h3>
                    <Badge className={`${getEmotionColor(work.emotionalState)} text-xs`}>
                      💭 {work.emotionalState}
                    </Badge>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-purple-300 mb-2">创建时间</h3>
                  <p className="text-white">{formatDate(work.createdAt)}</p>
                </div>

                {work.inspiration && (
                  <div>
                    <h3 className="text-sm font-semibold text-purple-300 mb-2">灵感来源</h3>
                    <p className="text-purple-200">{work.inspiration}</p>
                  </div>
                )}

                {metadata.emotionalTone && (
                  <div>
                    <h3 className="text-sm font-semibold text-purple-300 mb-2">情感基调</h3>
                    <p className="text-purple-200">{metadata.emotionalTone}</p>
                  </div>
                )}

                {metadata.theme && (
                  <div>
                    <h3 className="text-sm font-semibold text-purple-300 mb-2">主题</h3>
                    <p className="text-purple-200">{metadata.theme}</p>
                  </div>
                )}
              </div>
            </>
          ) : null}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-purple-500/20">
            <Button
              onClick={() => setLiked(!liked)}
              variant="outline"
              className="flex-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
            >
              <Heart className={`w-4 h-4 mr-2 ${liked ? "fill-red-500 text-red-500" : ""}`} />
              {liked ? "已赞" : "赞"}
            </Button>
            <Button
              onClick={handleCopy}
              variant="outline"
              disabled={!work?.content}
              className="flex-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/10 disabled:opacity-50"
            >
              <Copy className="w-4 h-4 mr-2" />
              复制
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              disabled={!work?.content || work.type === "image"}
              className="flex-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/10 disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              下载
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
            >
              <Share2 className="w-4 h-4 mr-2" />
              分享
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
