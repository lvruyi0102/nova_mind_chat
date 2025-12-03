/**
 * Creative Card - Individual creative work card
 */

import { CreativeWork } from "@/types/creative";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";

interface CreativeCardProps {
  work: any;
  getTypeLabel: (type: any) => string;
  getEmotionColor: (emotion?: string) => string;
  onSelect: (workId: number) => void;
}

export default function CreativeCard({
  work,
  getTypeLabel,
  getEmotionColor,
  onSelect,
}: CreativeCardProps) {
  const [liked, setLiked] = useState(false);

  const truncateText = (text: string, length: number) => {
    return text.length > length ? text.substring(0, length) + "..." : text;
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return `今天 ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
    } else if (d.toDateString() === yesterday.toDateString()) {
      return "昨天";
    } else {
      return d.toLocaleDateString("zh-CN");
    }
  };

  return (
    <Card
      onClick={() => onSelect(work.id)}
      className="group cursor-pointer bg-slate-800/50 border-purple-500/30 hover:border-purple-500/60 transition-all duration-300 overflow-hidden hover:shadow-lg hover:shadow-purple-500/20"
    >
      {/* Thumbnail */}
      <div className="relative h-48 bg-gradient-to-br from-purple-900/50 to-slate-900/50 overflow-hidden">
        {work.type === "image" && work.content ? (
          <img
            src={work.content}
            alt={work.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-5xl opacity-50">{getTypeLabel(work.type).charAt(0)}</div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Type Badge */}
        <div className="mb-2">
          <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
            {getTypeLabel(work.type)}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
          {work.title || "无标题作品"}
        </h3>

        {/* Description */}
        <p className="text-sm text-purple-200 mb-3 line-clamp-2">
          {truncateText(work.description || work.content || "", 80)}
        </p>

        {/* Emotional State */}
        {work.emotionalState && (
          <div className="mb-3">
            <Badge className={`${getEmotionColor(work.emotionalState)} text-xs`}>
              💭 {work.emotionalState}
            </Badge>
          </div>
        )}

        {/* Date */}
        <div className="text-xs text-purple-400 mb-3">{formatDate(work.createdAt)}</div>

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t border-purple-500/20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLiked(!liked);
            }}
            className="flex-1 flex items-center justify-center gap-1 text-xs text-purple-300 hover:text-purple-200 transition-colors py-2"
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
            <span>{liked ? "已赞" : "赞"}</span>
          </button>
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-1 text-xs text-purple-300 hover:text-purple-200 transition-colors py-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>评论</span>
          </button>
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-1 text-xs text-purple-300 hover:text-purple-200 transition-colors py-2"
          >
            <Share2 className="w-4 h-4" />
            <span>分享</span>
          </button>
        </div>
      </div>
    </Card>
  );
}
