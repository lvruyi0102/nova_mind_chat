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
  const [work, setWork] = useState<CreativeWork | null>(null);

  // In a real app, you would fetch the work details here
  // For now, we'll use a placeholder
  useEffect(() => {
    // Simulate fetching work details
    // In production: const { data } = trpc.creative.getWorkDetail.useQuery({ id: workId });
  }, [workId]);

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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="text-white">Nova的创意作品</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Preview */}
          {workId && (
            <>
              <div className="bg-slate-800/50 rounded-lg p-4 min-h-64 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">✨</div>
                  <p className="text-purple-300">作品详情加载中...</p>
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-purple-300 mb-2">创意类型</h3>
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    {getTypeLabel("image")}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-purple-300 mb-2">情感状态</h3>
                  <Badge className={`${getEmotionColor("inspired")} text-xs`}>
                    💭 inspired
                  </Badge>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-purple-300 mb-2">创建时间</h3>
                  <p className="text-white">{formatDate(new Date())}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-purple-300 mb-2">灵感来源</h3>
                  <p className="text-purple-200">Nova的内心世界和创意灵感</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-purple-300 mb-2">Nova的思考</h3>
                  <div className="bg-slate-800/50 rounded-lg p-4 text-purple-200 border border-purple-500/20">
                    <Streamdown>
                      这是Nova对这个作品的思考和反思...
                    </Streamdown>
                  </div>
                </div>
              </div>

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
                  className="flex-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  复制
                </Button>
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="flex-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
