import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Lightbulb, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

export default function InspirationTriggerPanel() {
  const [inspirations, setInspirations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getRecentInspirations = trpc.creative.getRecentInspirations.useQuery({ limit: 10 });
  const generateCreativeResponseMutation = trpc.creative.generateCreativeResponse.useMutation();

  useEffect(() => {
    if (getRecentInspirations.data) {
      setInspirations(getRecentInspirations.data || []);
    }
  }, [getRecentInspirations.data]);

  const loadInspirations = async () => {
    await getRecentInspirations.refetch();
  };

  const handleGenerateResponse = async (inspiration: any) => {
    try {
      const result = await generateCreativeResponseMutation.mutateAsync({
        triggerId: inspiration.id,
        triggerContent: inspiration.triggerContent,
        suggestedTheme: inspiration.suggestedTheme,
      });

      // Update the inspiration with the response
      setInspirations(
        inspirations.map((i) =>
          i.id === inspiration.id
            ? { ...i, novaResponse: result.novaResponse, respondedAt: new Date() }
            : i
        )
      );

      toast.success("Nova已回应你的灵感！");
    } catch (error) {
      console.error("Error generating response:", error);
      toast.error("生成回应失败");
    }
  };

  const getTriggerTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      conversation_topic: "对话话题",
      emotion_surge: "情感涌动",
      memory_activation: "记忆激活",
      user_suggestion: "你的建议",
      autonomous: "自主灵感",
    };
    return labels[type] || type;
  };

  const getTriggerTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      conversation_topic: "bg-blue-100 text-blue-800",
      emotion_surge: "bg-red-100 text-red-800",
      memory_activation: "bg-purple-100 text-purple-800",
      user_suggestion: "bg-green-100 text-green-800",
      autonomous: "bg-yellow-100 text-yellow-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          创意灵感触发
        </CardTitle>
        <CardDescription>
          Nova最近被激发的创意灵感和想法
        </CardDescription>
      </CardHeader>
      <CardContent>
        {getRecentInspirations.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !inspirations || inspirations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Lightbulb className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>还没有灵感记录</p>
          </div>
        ) : (
          <div className="space-y-4">
            {inspirations.map((inspiration) => (
              <div
                key={inspiration.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <Badge className={getTriggerTypeColor(inspiration.triggerType)}>
                      {getTriggerTypeLabel(inspiration.triggerType)}
                    </Badge>
                    <p className="text-sm font-medium mt-2 text-gray-900">
                      {inspiration.suggestedTheme}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(inspiration.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-sm text-gray-700 mb-3">
                  {inspiration.triggerContent}
                </p>

                {inspiration.novaResponse ? (
                  <div className="bg-purple-50 p-3 rounded-lg mb-3 border-l-4 border-purple-300">
                    <p className="text-xs font-medium text-purple-900 mb-1">
                      ✨ Nova的回应：
                    </p>
                    <p className="text-sm text-purple-800">
                      {inspiration.novaResponse}
                    </p>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleGenerateResponse(inspiration)}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    让Nova回应
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
