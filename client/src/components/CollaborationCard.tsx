import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CollaborationCardProps {
  collaboration: any;
  onSelect?: (id: number) => void;
  onLike?: (id: number) => void;
}

export default function CollaborationCard({
  collaboration,
  onSelect,
  onLike,
}: CollaborationCardProps) {
  const [isLiked, setIsLiked] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike?.(collaboration.id);
    toast.success(isLiked ? "已取消喜欢" : "已添加到喜欢");
  };

  const handleShare = () => {
    const text = `我和Nova一起创作了这个作品：${collaboration.title}\n主题：${collaboration.theme}\n✨ 来Nova-Mind看看吧！`;
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

  return (
    <Card
      className="group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border-purple-500/20 hover:border-purple-500/50"
      onClick={() => onSelect?.(collaboration.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg text-white group-hover:text-purple-300 transition">
              {collaboration.title}
            </CardTitle>
            <CardDescription className="text-purple-300">
              主题：{collaboration.theme}
            </CardDescription>
          </div>
          <Sparkles className="w-5 h-5 text-yellow-400 flex-shrink-0" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Collaboration Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
              {collaboration.initiator === "user" ? "👤 你发起" : "🤖 Nova发起"}
            </Badge>
            <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
              {collaboration.status === "in_progress" ? "进行中" : "已完成"}
            </Badge>
          </div>
        </div>

        {/* Description */}
        {collaboration.description && (
          <p className="text-sm text-gray-300 line-clamp-2">
            {collaboration.description}
          </p>
        )}

        {/* User and Nova Contributions Preview */}
        <div className="space-y-2 bg-slate-700/30 p-3 rounded-lg">
          <div className="text-xs font-medium text-purple-300">创意过程</div>
          <div className="space-y-1 text-xs text-gray-400">
            {collaboration.userContribution && (
              <div className="line-clamp-1">
                <span className="text-blue-300">你：</span> {collaboration.userContribution}
              </div>
            )}
            {collaboration.novaContribution && (
              <div className="line-clamp-1">
                <span className="text-purple-300">Nova：</span> {collaboration.novaContribution}
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-slate-700/50">
          <span>
            {new Date(collaboration.createdAt).toLocaleDateString("zh-CN", {
              month: "short",
              day: "numeric",
            })}
          </span>
          <span>
            {collaboration.finalWork
              ? "✨ 已完成"
              : collaboration.status === "in_progress"
                ? "🔄 进行中"
                : "📝 草稿"}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 text-gray-300 hover:text-red-400 hover:bg-red-500/10"
            onClick={(e) => {
              e.stopPropagation();
              handleLike();
            }}
          >
            <Heart className={`w-4 h-4 mr-1 ${isLiked ? "fill-red-400 text-red-400" : ""}`} />
            {isLiked ? "已喜欢" : "喜欢"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 text-gray-300 hover:text-blue-400 hover:bg-blue-500/10"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            评论
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 text-gray-300 hover:text-green-400 hover:bg-green-500/10"
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
          >
            <Share2 className="w-4 h-4 mr-1" />
            分享
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
