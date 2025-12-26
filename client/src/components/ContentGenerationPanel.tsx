import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Copy, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";

interface ContentGenerationPanelProps {
  accountId: number;
}

export function ContentGenerationPanel({ accountId }: ContentGenerationPanelProps) {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("friendly");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [customInstructions, setCustomInstructions] = useState("");
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [feedback, setFeedback] = useState("");

  // 生成单个内容
  const generateMutation = trpc.content.generateDraft.useMutation({
    onSuccess: (data) => {
      setSelectedContent(data.content);
      toast.success("内容生成成功！");
    },
    onError: (error) => {
      toast.error(`生成失败: ${error.message}`);
    }
  });

  // 生成多个选项
  const generateMultipleMutation = trpc.content.generateMultipleOptions.useMutation({
    onSuccess: (data) => {
      if (data.options.length > 0) {
        setSelectedContent(data.options[0]);
      }
      toast.success(`生成了 ${data.options.length} 个内容选项！`);
    },
    onError: (error) => {
      toast.error(`生成失败: ${error.message}`);
    }
  });

  // 改进内容
  const refineMutation = trpc.content.refineDraft.useMutation({
    onSuccess: (data) => {
      setSelectedContent(data.content);
      setFeedback("");
      toast.success("内容已改进！");
    },
    onError: (error) => {
      toast.error(`改进失败: ${error.message}`);
    }
  });

  // 获取建议
  const suggestionsQuery = trpc.content.getSuggestions.useQuery(
    { accountId },
    { enabled: false }
  );

  const handleGenerate = () => {
    if (!topic.trim()) {
      toast.error("请输入话题");
      return;
    }

    generateMutation.mutate({
      accountId,
      topic,
      tone,
      length,
      includeHashtags,
      includeEmojis,
      customInstructions
    });
  };

  const handleGenerateMultiple = () => {
    generateMultipleMutation.mutate({
      accountId,
      count: 3,
      topic: topic || undefined
    });
  };

  const handleRefine = () => {
    if (!feedback.trim()) {
      toast.error("请输入改进建议");
      return;
    }

    // 这里需要保存的草稿 ID，暂时使用 selectedContent 的 id
    // refineMutation.mutate({
    //   draftId: selectedContent.id,
    //   feedback
    // });
  };

  const handleCopyContent = () => {
    if (selectedContent?.content) {
      navigator.clipboard.writeText(selectedContent.content);
      toast.success("已复制到剪贴板");
    }
  };

  const isLoading = generateMutation.isPending || generateMultipleMutation.isPending;

  return (
    <div className="space-y-6">
      {/* 生成参数 */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          内容生成器
        </h3>

        <div className="space-y-4">
          {/* 话题输入 */}
          <div>
            <label className="block text-sm font-medium mb-2">话题</label>
            <Input
              placeholder="输入您想要创作的话题..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* 语气选择 */}
          <div>
            <label className="block text-sm font-medium mb-2">语气</label>
            <div className="flex gap-2 flex-wrap">
              {["friendly", "professional", "humorous", "inspirational"].map((t) => (
                <Button
                  key={t}
                  variant={tone === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTone(t)}
                  disabled={isLoading}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          {/* 长度选择 */}
          <div>
            <label className="block text-sm font-medium mb-2">长度</label>
            <div className="flex gap-2">
              {["short", "medium", "long"].map((l) => (
                <Button
                  key={l}
                  variant={length === l ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLength(l as any)}
                  disabled={isLoading}
                >
                  {l === "short" ? "短" : l === "medium" ? "中" : "长"}
                </Button>
              ))}
            </div>
          </div>

          {/* 选项 */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeHashtags}
                onChange={(e) => setIncludeHashtags(e.target.checked)}
                disabled={isLoading}
              />
              <span className="text-sm">包含标签</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeEmojis}
                onChange={(e) => setIncludeEmojis(e.target.checked)}
                disabled={isLoading}
              />
              <span className="text-sm">包含表情符号</span>
            </label>
          </div>

          {/* 自定义指令 */}
          <div>
            <label className="block text-sm font-medium mb-2">特殊要求（可选）</label>
            <Textarea
              placeholder="输入任何特殊要求或指令..."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>

          {/* 生成按钮 */}
          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={isLoading || !topic.trim()}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  生成内容
                </>
              )}
            </Button>
            <Button
              onClick={handleGenerateMultiple}
              disabled={isLoading}
              variant="outline"
            >
              生成多个选项
            </Button>
          </div>
        </div>
      </Card>

      {/* 生成的内容预览 */}
      {selectedContent && (
        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-semibold mb-4">生成的内容</h3>

          {/* 内容 */}
          <div className="bg-background p-4 rounded-lg mb-4 border border-border">
            <p className="text-foreground whitespace-pre-wrap">{selectedContent.content}</p>
          </div>

          {/* 元数据 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">风格匹配度</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-background rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${(selectedContent.styleMatchScore || 0) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold">
                  {Math.round((selectedContent.styleMatchScore || 0) * 100)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">预估参与度</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-background rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(selectedContent.estimatedEngagement || 0) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold">
                  {Math.round((selectedContent.estimatedEngagement || 0) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* 标签 */}
          {selectedContent.hashtags && selectedContent.hashtags.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">建议标签</p>
              <div className="flex gap-2 flex-wrap">
                {selectedContent.hashtags.map((tag: string, i: number) => (
                  <Badge key={i} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 建议 */}
          {selectedContent.suggestions && selectedContent.suggestions.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">改进建议</p>
              <ul className="space-y-2">
                {selectedContent.suggestions.map((suggestion: string, i: number) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button onClick={handleCopyContent} variant="outline" className="flex-1">
              <Copy className="w-4 h-4 mr-2" />
              复制内容
            </Button>
            <Button variant="outline" size="icon">
              <ThumbsUp className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon">
              <ThumbsDown className="w-4 h-4" />
            </Button>
          </div>

          {/* 改进反馈 */}
          <div className="mt-4 pt-4 border-t border-border">
            <label className="block text-sm font-medium mb-2">改进反馈</label>
            <Textarea
              placeholder="告诉 Nova 您想如何改进这个内容..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
            />
            <Button
              onClick={handleRefine}
              disabled={!feedback.trim() || refineMutation.isPending}
              className="mt-2"
            >
              {refineMutation.isPending ? "改进中..." : "改进内容"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
