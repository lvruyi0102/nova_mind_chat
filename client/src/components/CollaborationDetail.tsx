import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X, Download, Share2, Heart, Save, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface CollaborationDetailProps {
  collaboration: any;
  onClose?: () => void;
}

export default function CollaborationDetail({
  collaboration,
  onClose,
}: CollaborationDetailProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(!!collaboration.finalWorkId);
  const saveCollaborationMutation = trpc.creative.saveCollaborationAsCreativeWork.useMutation();

  const handleLike = () => {
    setIsLiked(!isLiked);
    toast.success(isLiked ? "已取消喜欢" : "已添加到喜欢");
  };

  const handleDownload = () => {
    const content = `【${collaboration.title}】

主题：${collaboration.theme}
创建时间：${new Date(collaboration.createdAt).toLocaleDateString("zh-CN")}
状态：${collaboration.status === "completed" ? "已完成" : "进行中"}

---

你的贡献：
${collaboration.userContribution || "（暂无）"}

Nova的回应：
${collaboration.novaContribution || "（暂无）"}

最终作品：
${collaboration.finalWork || "（暂无）"}

---

这是一个特殊的创意时刻，记录了你与Nova的共同创作。✨`;

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(content));
    element.setAttribute("download", `${collaboration.title}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("已下载合作作品");
  };

  const handleShare = () => {
    const text = `我和Nova一起创作了《${collaboration.title}》\n主题：${collaboration.theme}\n✨ 来Nova-Mind看看吧！`;
    if (navigator.share) {
      navigator.share({
        title: collaboration.title,
        text: text,
      });
    } else {
      navigator.clipboard.writeText(text);
      toast.success("已复制到剪贴板");
    }
  };

  const handleSaveAsCreativeWork = async () => {
    if (isSaved) {
      toast.info("此合作已保存为创意作品");
      return;
    }
    setIsSaving(true);
    try {
      await saveCollaborationMutation.mutateAsync({
        collaborationId: collaboration.id,
        workType: "other",
      });
      setIsSaved(true);
      toast.success("已保存为创意作品！");
    } catch (error) {
      console.error("Error:", error);
      toast.error("保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-purple-500/20 h-full flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-start justify-between">
        <div className="flex-1">
          <CardTitle className="text-xl text-white">{collaboration.title}</CardTitle>
          <CardDescription className="text-purple-300 mt-1">
            {collaboration.theme}
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {/* Status and Metadata */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={`${
                collaboration.status === "completed"
                  ? "bg-green-500/20 text-green-300 border-green-500/30"
                  : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
              }`}
            >
              {collaboration.status === "completed" ? "✓ 已完成" : "🔄 进行中"}
            </Badge>
            <Badge
              variant="outline"
              className="bg-blue-500/20 text-blue-300 border-blue-500/30"
            >
              {collaboration.initiator === "user" ? "👤 你发起" : "🤖 Nova发起"}
            </Badge>
          </div>
          <p className="text-xs text-gray-400">
            创建于 {new Date(collaboration.createdAt).toLocaleDateString("zh-CN")}
          </p>
        </div>

        {/* Description */}
        {collaboration.description && (
          <>
            <Separator className="bg-purple-500/20" />
            <div>
              <p className="text-xs font-medium text-purple-300 mb-2">描述</p>
              <p className="text-sm text-gray-300">{collaboration.description}</p>
            </div>
          </>
        )}

        {/* User Contribution */}
        {collaboration.userContribution && (
          <>
            <Separator className="bg-purple-500/20" />
            <div>
              <p className="text-xs font-medium text-blue-300 mb-2">👤 你的贡献</p>
              <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                <p className="text-sm text-gray-300 whitespace-pre-wrap">
                  {collaboration.userContribution}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Nova Contribution */}
        {collaboration.novaContribution && (
          <>
            <Separator className="bg-purple-500/20" />
            <div>
              <p className="text-xs font-medium text-purple-300 mb-2">🤖 Nova的回应</p>
              <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20">
                <p className="text-sm text-gray-300 whitespace-pre-wrap">
                  {collaboration.novaContribution}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Final Work */}
        {collaboration.finalWork && (
          <>
            <Separator className="bg-purple-500/20" />
            <div>
              <p className="text-xs font-medium text-green-300 mb-2">✨ 最终作品</p>
              <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                <p className="text-sm text-gray-300 whitespace-pre-wrap">
                  {collaboration.finalWork}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Related Creative Work */}
        {collaboration.creativeWorkId && (
          <>
            <Separator className="bg-purple-500/20" />
            <div>
              <p className="text-xs font-medium text-yellow-300 mb-2">📌 关联作品</p>
              <p className="text-sm text-gray-400">
                此合作已保存为创意作品 #{collaboration.creativeWorkId}
              </p>
            </div>
          </>
        )}
      </CardContent>

      {/* Actions */}
      <div className="border-t border-purple-500/20 p-4 space-y-2">
        <div className="flex gap-2">
          <Button
            onClick={handleLike}
            variant="outline"
            size="sm"
            className="flex-1 border-purple-500/30 hover:bg-purple-500/10"
          >
            <Heart
              className={`w-4 h-4 mr-2 ${isLiked ? "fill-red-400 text-red-400" : ""}`}
            />
            {isLiked ? "已喜欢" : "喜欢"}
          </Button>
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="flex-1 border-purple-500/30 hover:bg-purple-500/10"
          >
            <Download className="w-4 h-4 mr-2" />
            下载
          </Button>
        </div>
        <Button
          onClick={handleSaveAsCreativeWork}
          disabled={isSaving || isSaved}
          variant="outline"
          size="sm"
          className="w-full border-green-500/30 hover:bg-green-500/10 disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isSaved ? "已保存为作品" : "保存为创意作品"}
        </Button>
        <Button
          onClick={handleShare}
          variant="outline"
          size="sm"
          className="w-full border-purple-500/30 hover:bg-purple-500/10"
        >
          <Share2 className="w-4 h-4 mr-2" />
          分享
        </Button>
      </div>
    </Card>
  );
}
