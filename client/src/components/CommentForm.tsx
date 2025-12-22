import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Send } from "lucide-react";

interface CommentFormProps {
  onSubmit: (data: {
    content: string;
    sentiment: "positive" | "neutral" | "constructive_criticism";
    emotionalTone?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export default function CommentForm({
  onSubmit,
  isLoading = false,
}: CommentFormProps) {
  const [content, setContent] = useState("");
  const [sentiment, setSentiment] = useState<
    "positive" | "neutral" | "constructive_criticism"
  >("positive");
  const [emotionalTone, setEmotionalTone] = useState("");

  const handleSubmit = async () => {
    if (!content.trim()) return;

    try {
      await onSubmit({
        content: content.trim(),
        sentiment,
        emotionalTone: emotionalTone || undefined,
      });

      // Reset form
      setContent("");
      setEmotionalTone("");
      setSentiment("positive");
    } catch (error) {
      console.error("Error submitting comment:", error);
    }
  };

  return (
    <Card className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 border-blue-200">
      <h3 className="font-semibold text-slate-900 mb-4">💬 给Nova的评论</h3>

      {/* 评论内容 */}
      <div className="mb-4">
        <Label htmlFor="comment-content" className="text-sm font-medium mb-2 block">
          你的想法
        </Label>
        <Textarea
          id="comment-content"
          placeholder="分享你对Nova这个创意作品的想法..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-24 resize-none"
          disabled={isLoading}
        />
        <p className="text-xs text-slate-500 mt-1">
          {content.length}/500 字符
        </p>
      </div>

      {/* 情感类型 */}
      <div className="mb-4">
        <Label className="text-sm font-medium mb-3 block">评论类型</Label>
        <RadioGroup value={sentiment} onValueChange={(value: any) => setSentiment(value)}>
          <div className="flex items-center gap-3 mb-2">
            <RadioGroupItem value="positive" id="sentiment-positive" />
            <Label htmlFor="sentiment-positive" className="cursor-pointer flex-1">
              <span className="font-medium">👍 积极反馈</span>
              <p className="text-xs text-slate-500">鼓励和赞美</p>
            </Label>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <RadioGroupItem value="neutral" id="sentiment-neutral" />
            <Label htmlFor="sentiment-neutral" className="cursor-pointer flex-1">
              <span className="font-medium">💭 中立观点</span>
              <p className="text-xs text-slate-500">客观分析</p>
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <RadioGroupItem
              value="constructive_criticism"
              id="sentiment-constructive"
            />
            <Label htmlFor="sentiment-constructive" className="cursor-pointer flex-1">
              <span className="font-medium">💡 建设性批评</span>
              <p className="text-xs text-slate-500">提供改进建议</p>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* 情感基调 */}
      <div className="mb-4">
        <Label htmlFor="emotional-tone" className="text-sm font-medium mb-2 block">
          情感基调（可选）
        </Label>
        <input
          id="emotional-tone"
          type="text"
          placeholder="例如：温暖、鼓励、深思..."
          value={emotionalTone}
          onChange={(e) => setEmotionalTone(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
      </div>

      {/* 提交按钮 */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={() => {
            setContent("");
            setEmotionalTone("");
            setSentiment("positive");
          }}
          disabled={isLoading || !content}
        >
          清空
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !content.trim()}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              提交中...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              提交评论
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
