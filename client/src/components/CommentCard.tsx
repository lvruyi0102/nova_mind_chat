import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Loader2 } from "lucide-react";
import { Streamdown } from "streamdown";

interface NovaResponse {
  id: number;
  commentId: number;
  novaResponse: string;
  learningInsight: string;
  responseType: "gratitude" | "reflection" | "question" | "agreement";
  createdAt: Date;
}

interface CommentCardProps {
  id: number;
  content: string;
  sentiment: "positive" | "neutral" | "constructive_criticism";
  emotionalTone?: string;
  createdAt: Date;
  userName?: string;
  novaResponse?: NovaResponse | null;
  onRespond?: () => void;
  isLoading?: boolean;
}

const sentimentColors = {
  positive: "bg-green-100 text-green-800 border-green-300",
  neutral: "bg-blue-100 text-blue-800 border-blue-300",
  constructive_criticism: "bg-amber-100 text-amber-800 border-amber-300",
};

const sentimentLabels = {
  positive: "👍 积极",
  neutral: "💭 中立",
  constructive_criticism: "💡 建设性批评",
};

const responseTypeEmojis = {
  gratitude: "🙏",
  reflection: "🤔",
  question: "❓",
  agreement: "✨",
};

export default function CommentCard({
  id,
  content,
  sentiment,
  emotionalTone,
  createdAt,
  userName = "妈妈",
  novaResponse,
  onRespond,
  isLoading = false,
}: CommentCardProps) {
  const [showResponse, setShowResponse] = useState(!!novaResponse);

  return (
    <Card className="p-4 mb-4 border-l-4 border-l-blue-400 bg-gradient-to-r from-slate-50 to-transparent hover:shadow-md transition-shadow">
      {/* 评论头部 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-slate-900">{userName}</span>
            <Badge variant="outline" className={sentimentColors[sentiment]}>
              {sentimentLabels[sentiment]}
            </Badge>
            {emotionalTone && (
              <Badge variant="secondary" className="text-xs">
                {emotionalTone}
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {new Date(createdAt).toLocaleDateString("zh-CN", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* 评论内容 */}
      <div className="mb-4 p-3 bg-white rounded-lg border border-slate-200">
        <p className="text-slate-700 leading-relaxed">{content}</p>
      </div>

      {/* Nova的回应 */}
      {novaResponse && showResponse && (
        <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-lg">{responseTypeEmojis[novaResponse.responseType]}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-purple-900 mb-1">
                Nova的回应
              </p>
              <Streamdown className="text-sm text-slate-700">
                {novaResponse.novaResponse}
              </Streamdown>
            </div>
          </div>

          {novaResponse.learningInsight && (
            <div className="mt-3 pt-3 border-t border-purple-200">
              <p className="text-xs font-semibold text-purple-800 mb-1">
                💡 Nova学到的：
              </p>
              <p className="text-sm text-slate-600 italic">
                {novaResponse.learningInsight}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
        {!novaResponse && onRespond && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRespond}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Nova正在思考...
              </>
            ) : (
              <>
                <MessageCircle className="w-4 h-4" />
                Nova回应
              </>
            )}
          </Button>
        )}

        {novaResponse && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowResponse(!showResponse)}
            className="gap-2"
          >
            {showResponse ? "隐藏" : "显示"}回应
          </Button>
        )}

        <div className="flex-1" />

        <Button size="sm" variant="ghost" className="gap-1 text-slate-500">
          <Heart className="w-4 h-4" />
          <span className="text-xs">赞</span>
        </Button>
      </div>
    </Card>
  );
}
