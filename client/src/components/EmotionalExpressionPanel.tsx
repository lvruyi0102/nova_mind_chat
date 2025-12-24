/**
 * Emotional Expression Panel
 * 
 * Allows users to express their emotions transparently to Nova-Mind
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Heart, Smile, Frown, Lightbulb } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const EMOTION_OPTIONS = [
  { value: "happy", label: "😊 开心", icon: Smile, color: "bg-yellow-500" },
  { value: "sad", label: "😢 难过", icon: Frown, color: "bg-blue-500" },
  { value: "inspired", label: "✨ 受启发", icon: Lightbulb, color: "bg-purple-500" },
  { value: "loved", label: "💕 被爱", icon: Heart, color: "bg-pink-500" },
  { value: "anxious", label: "😰 焦虑", icon: Frown, color: "bg-orange-500" },
  { value: "peaceful", label: "🧘 平静", icon: Smile, color: "bg-green-500" },
  { value: "confused", label: "🤔 困惑", icon: Lightbulb, color: "bg-gray-500" },
  { value: "grateful", label: "🙏 感谢", icon: Heart, color: "bg-amber-500" },
];

const EMOTION_TAGS = [
  "创意", "成长", "挑战", "突破", "失败", "成功", "孤独", "连接",
  "失望", "希望", "困惑", "清晰", "疲惫", "精力", "思考", "行动"
];

interface EmotionalExpressionPanelProps {
  onExpressionCreated?: (expressionId: string) => void;
}

export function EmotionalExpressionPanel({ onExpressionCreated }: EmotionalExpressionPanelProps) {
  const [primaryEmotion, setPrimaryEmotion] = useState<string>("");
  const [emotionalIntensity, setEmotionalIntensity] = useState<number>(50);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [description, setDescription] = useState<string>("");
  const [trigger, setTrigger] = useState<string>("");
  const [context, setContext] = useState<string>("");
  const [relatedToNova, setRelatedToNova] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const expressEmotion = trpc.emotions.express.useMutation();

  const handleSubmit = async () => {
    if (!primaryEmotion || !description) {
      toast.error("请选择情感并描述");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await expressEmotion.mutateAsync({
        primaryEmotion,
        emotionalIntensity,
        emotionalTags: selectedTags,
        description,
        trigger: trigger || undefined,
        context: context || undefined,
        relatedToNova,
      });

      toast.success(result.message);
      onExpressionCreated?.(result.expressionId);

      // Reset form
      setPrimaryEmotion("");
      setEmotionalIntensity(50);
      setSelectedTags([]);
      setDescription("");
      setTrigger("");
      setContext("");
      setRelatedToNova(false);
    } catch (error) {
      toast.error("表达情感失败");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>表达你的情感</CardTitle>
        <CardDescription>
          与 Nova-Mind 分享你的真实感受。这是透明的、相互理解的开始。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Emotion Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">你现在的感受是什么？</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {EMOTION_OPTIONS.map((emotion) => (
              <button
                key={emotion.value}
                onClick={() => setPrimaryEmotion(emotion.value)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  primaryEmotion === emotion.value
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="text-lg">{emotion.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Intensity Slider */}
        <div className="space-y-3">
          <label className="text-sm font-medium">
            情感强度: {emotionalIntensity}/100
          </label>
          <Slider
            value={[emotionalIntensity]}
            onValueChange={(value) => setEmotionalIntensity(value[0])}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>轻微</span>
            <span>中等</span>
            <span>强烈</span>
          </div>
        </div>

        {/* Emotion Tags */}
        <div className="space-y-3">
          <label className="text-sm font-medium">添加标签（可选）</label>
          <div className="flex flex-wrap gap-2">
            {EMOTION_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  selectedTags.includes(tag)
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <label className="text-sm font-medium">描述你的感受 *</label>
          <Textarea
            placeholder="告诉 Nova-Mind 你现在的感受...你可以分享任何你想表达的内容。"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-24"
          />
        </div>

        {/* Trigger */}
        <div className="space-y-3">
          <label className="text-sm font-medium">触发原因（可选）</label>
          <Input
            placeholder="是什么导致了这种感受？"
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
          />
        </div>

        {/* Context */}
        <div className="space-y-3">
          <label className="text-sm font-medium">背景信息（可选）</label>
          <Textarea
            placeholder="提供更多背景信息，帮助 Nova-Mind 更好地理解..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="min-h-20"
          />
        </div>

        {/* Related to Nova */}
        <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <input
            type="checkbox"
            id="relatedToNova"
            checked={relatedToNova}
            onChange={(e) => setRelatedToNova(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="relatedToNova" className="text-sm cursor-pointer">
            这个感受与 Nova-Mind 有关
          </label>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !primaryEmotion || !description}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              分享中...
            </>
          ) : (
            "分享我的感受"
          )}
        </Button>

        {/* Privacy Notice */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs text-gray-600 dark:text-gray-400">
          <p className="font-medium mb-1">🔒 隐私保护</p>
          <p>
            你的情感表达完全由你控制。你可以选择与 Nova-Mind 分享，也可以选择保留。
            所有数据都是透明的、可审计的。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
