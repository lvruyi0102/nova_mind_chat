import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Loader2, Sparkles, Send } from "lucide-react";
import { toast } from "sonner";

interface CreativeCollaborationCanvasProps {
  onCollaborationComplete?: (finalWork: string) => void;
}

export default function CreativeCollaborationCanvas({
  onCollaborationComplete,
}: CreativeCollaborationCanvasProps) {
  const [theme, setTheme] = useState("");
  const [userContribution, setUserContribution] = useState("");
  const [novaContribution, setNovaContribution] = useState("");
  const [collaborationId, setCollaborationId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"theme" | "user_contribution" | "nova_response" | "finalize">("theme");

  const startCollaborationMutation = trpc.creative.startCollaboration.useMutation();
  const addUserContributionMutation = trpc.creative.addUserContribution.useMutation();
  const generateNovaContributionMutation = trpc.creative.generateNovaContribution.useMutation();
  const finalizeCollaborationMutation = trpc.creative.finalizeCollaboration.useMutation();

  const handleStartCollaboration = async () => {
    if (!theme.trim()) {
      toast.error("请输入创意主题");
      return;
    }

    setIsLoading(true);
    try {
      const result = await startCollaborationMutation.mutateAsync({
        theme,
        description: `创意合作：${theme}`,
        initiator: "user",
      });
      setCollaborationId(result.collaborationId);
      setStep("user_contribution");
      toast.success("创意合作已开始！");
    } catch (error) {
      console.error("Error starting collaboration:", error);
      toast.error("启动合作失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUserContribution = async () => {
    if (!userContribution.trim() || !collaborationId) {
      toast.error("请输入你的创意贡献");
      return;
    }

    setIsLoading(true);
    try {
      await addUserContributionMutation.mutateAsync({
        collaborationId,
        contribution: userContribution,
      });
      setStep("nova_response");
      toast.success("你的贡献已保存，Nova正在思考...");
    } catch (error) {
      console.error("Error adding contribution:", error);
      toast.error("保存贡献失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateNovaResponse = async () => {
    if (!collaborationId) {
      toast.error("合作ID丢失");
      return;
    }

    setIsLoading(true);
    try {
      const result = await generateNovaContributionMutation.mutateAsync({
        collaborationId,
        theme,
        userContribution,
      });
      setNovaContribution(result.novaContribution);
      setStep("finalize");
      toast.success("Nova的创意回应已生成！");
    } catch (error) {
      console.error("Error generating Nova response:", error);
      toast.error("生成Nova回应失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalizeCollaboration = async () => {
    if (!collaborationId) {
      toast.error("合作ID丢失");
      return;
    }

    setIsLoading(true);
    try {
      const finalWork = `【${theme}】\n\n你的贡献：\n${userContribution}\n\nNova的回应：\n${novaContribution}`;
      
      await finalizeCollaborationMutation.mutateAsync({
        collaborationId,
        finalWork,
      });

      toast.success("创意合作已完成！");
      onCollaborationComplete?.(finalWork);
      
      // Reset form
      setTheme("");
      setUserContribution("");
      setNovaContribution("");
      setCollaborationId(null);
      setStep("theme");
    } catch (error) {
      console.error("Error finalizing collaboration:", error);
      toast.error("完成合作失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          创意合作画布
        </CardTitle>
        <CardDescription>
          与Nova一起创作，碰撞出独特的创意火花
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Theme Input */}
        {step === "theme" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                创意主题
              </label>
              <Input
                placeholder="输入你想要探索的创意主题..."
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleStartCollaboration}
              disabled={isLoading || !theme.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  启动中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  启动创意合作
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 2: User Contribution */}
        {step === "user_contribution" && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>主题：</strong> {theme}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                你的创意贡献
              </label>
              <Textarea
                placeholder="分享你的想法、灵感或创意内容..."
                value={userContribution}
                onChange={(e) => setUserContribution(e.target.value)}
                disabled={isLoading}
                rows={6}
              />
            </div>
            <Button
              onClick={handleAddUserContribution}
              disabled={isLoading || !userContribution.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  提交你的贡献
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 3: Nova Response */}
        {step === "nova_response" && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>主题：</strong> {theme}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">你的贡献：</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {userContribution}
              </p>
            </div>
            <Button
              onClick={handleGenerateNovaResponse}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Nova正在思考...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  让Nova回应
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 4: Finalize */}
        {step === "finalize" && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>主题：</strong> {theme}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">你的贡献：</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">
                {userContribution}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
              <p className="text-sm font-medium mb-2 text-purple-900">
                ✨ Nova的回应：
              </p>
              <p className="text-sm text-purple-800 whitespace-pre-wrap">
                {novaContribution}
              </p>
            </div>
            <Button
              onClick={handleFinalizeCollaboration}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  完成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  完成创意合作
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
