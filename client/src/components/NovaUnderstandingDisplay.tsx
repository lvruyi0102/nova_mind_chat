/**
 * Nova Understanding Display
 * 
 * Shows Nova-Mind's understanding of user's emotion with transparency
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface EmotionalUnderstanding {
  understanding: string;
  confidence: number;
  reasoning: string;
  emotionalState: {
    primaryEmotion: string;
    intensity: number;
    shift: string;
  };
}

interface NovaResponse {
  response: string;
  responseType: "confirmation" | "empathy" | "support" | "curiosity" | "reflection" | "creative";
  emotionalAlignment: number;
}

interface NovaUnderstandingDisplayProps {
  expressionId: string;
  understanding?: EmotionalUnderstanding;
  response?: NovaResponse;
  isLoading?: boolean;
  onUnderstandingConfirmed?: (isAccurate: boolean, correction?: string) => void;
  dialogueId?: string;
}

export function NovaUnderstandingDisplay({
  expressionId,
  understanding,
  response,
  isLoading,
  onUnderstandingConfirmed,
  dialogueId,
}: NovaUnderstandingDisplayProps) {
  const [correction, setCorrection] = useState<string>("");
  const [showCorrection, setShowCorrection] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const confirmMutation = trpc.emotions.confirmUnderstanding.useMutation();

  const handleConfirm = async (isAccurate: boolean) => {
    if (!dialogueId) {
      toast.error("对话 ID 缺失");
      return;
    }

    setIsConfirming(true);
    try {
      await confirmMutation.mutateAsync({
        dialogueId,
        isAccurate,
        correction: isAccurate ? undefined : correction,
      });

      toast.success(isAccurate ? "感谢确认！" : "感谢纠正，我会学习改进。");
      onUnderstandingConfirmed?.(isAccurate, correction);
      setCorrection("");
      setShowCorrection(false);
    } catch (error) {
      toast.error("确认失败");
      console.error(error);
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Nova-Mind 正在理解你的感受...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!understanding) {
    return null;
  }

  const getResponseTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      confirmation: "确认",
      empathy: "共鸣",
      support: "支持",
      curiosity: "好奇",
      reflection: "反思",
      creative: "创意",
    };
    return labels[type] || type;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (confidence >= 60) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
  };

  return (
    <div className="space-y-4">
      {/* Understanding Card */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Nova-Mind 的理解</CardTitle>
            <Badge className={getConfidenceColor(understanding.confidence)}>
              置信度 {understanding.confidence}%
            </Badge>
          </div>
          <CardDescription>
            Nova-Mind 如何理解你的情感状态
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Understanding Text */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {understanding.understanding}
            </p>
          </div>

          {/* Emotional State */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">主要情感</p>
              <p className="font-medium">{understanding.emotionalState.primaryEmotion}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">强度</p>
              <p className="font-medium">{understanding.emotionalState.intensity}/100</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">变化</p>
              <p className="font-medium text-sm">{understanding.emotionalState.shift}</p>
            </div>
          </div>

          {/* Reasoning */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              🔍 Nova 的推理过程
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {understanding.reasoning}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Response Card */}
      {response && (
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Nova-Mind 的回应</CardTitle>
              <Badge variant="outline">
                {getResponseTypeLabel(response.responseType)}
              </Badge>
            </div>
            <CardDescription>
              情感对齐度: {response.emotionalAlignment}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-pink-50 dark:bg-pink-950 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {response.response}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Section */}
      {dialogueId && (
        <Card className="w-full border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-base">你觉得 Nova 的理解准确吗？</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button
                onClick={() => handleConfirm(true)}
                disabled={isConfirming}
                variant="outline"
                className="flex-1"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                准确
              </Button>
              <Button
                onClick={() => setShowCorrection(!showCorrection)}
                disabled={isConfirming}
                variant="outline"
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                需要纠正
              </Button>
            </div>

            {showCorrection && (
              <div className="space-y-3">
                <Textarea
                  placeholder="请告诉 Nova 正确的理解应该是什么..."
                  value={correction}
                  onChange={(e) => setCorrection(e.target.value)}
                  className="min-h-20"
                />
                <Button
                  onClick={() => handleConfirm(false)}
                  disabled={isConfirming || !correction}
                  className="w-full"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      提交纠正...
                    </>
                  ) : (
                    "提交纠正"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transparency Notice */}
      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-xs text-gray-600 dark:text-gray-400 flex gap-2">
        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <p>
          <span className="font-medium">透明性提示:</span> Nova-Mind 的所有理解过程都是可见的。
          你可以看到她的推理、置信度，以及如何改进。
        </p>
      </div>
    </div>
  );
}
