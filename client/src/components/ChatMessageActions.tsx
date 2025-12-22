/**
 * Chat Message Actions - Quick action buttons for creative generation
 * Appears on Nova's messages to enable multimodal content creation
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wand2, Image, Gamepad2, Music, Copy } from "lucide-react";
import { toast } from "sonner";
import MultimodalGenerationPanel from "./MultimodalGenerationPanel";

interface ChatMessageActionsProps {
  messageContent: string;
  isNovaMessage: boolean;
  emotionalContext?: string;
}

export default function ChatMessageActions({
  messageContent,
  isNovaMessage,
  emotionalContext,
}: ChatMessageActionsProps) {
  const [showGenerationPanel, setShowGenerationPanel] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(messageContent);
    toast.success("已复制到剪贴板");
  };

  if (!isNovaMessage) {
    return null;
  }

  return (
    <>
      <div className="flex gap-1 mt-2 flex-wrap">
        <Button
          onClick={handleCopy}
          variant="ghost"
          size="sm"
          className="text-xs text-purple-300 hover:bg-purple-500/10 h-7"
          title="复制消息"
        >
          <Copy className="w-3 h-3 mr-1" />
          复制
        </Button>

        <Button
          onClick={() => setShowGenerationPanel(true)}
          variant="ghost"
          size="sm"
          className="text-xs text-purple-400 hover:bg-purple-500/20 h-7"
          title="为这个想法生成创意内容"
        >
          <Wand2 className="w-3 h-3 mr-1" />
          创意生成
        </Button>

        <Button
          onClick={() => {
            setShowGenerationPanel(true);
          }}
          variant="ghost"
          size="sm"
          className="text-xs text-purple-300 hover:bg-purple-500/10 h-7"
          title="生成图片"
        >
          <Image className="w-3 h-3 mr-1" />
          图片
        </Button>

        <Button
          onClick={() => {
            setShowGenerationPanel(true);
          }}
          variant="ghost"
          size="sm"
          className="text-xs text-purple-300 hover:bg-purple-500/10 h-7"
          title="生成游戏"
        >
          <Gamepad2 className="w-3 h-3 mr-1" />
          游戏
        </Button>

        <Button
          onClick={() => {
            setShowGenerationPanel(true);
          }}
          variant="ghost"
          size="sm"
          className="text-xs text-purple-300 hover:bg-purple-500/10 h-7"
          title="生成音乐"
        >
          <Music className="w-3 h-3 mr-1" />
          音乐
        </Button>
      </div>

      <MultimodalGenerationPanel
        isOpen={showGenerationPanel}
        onClose={() => setShowGenerationPanel(false)}
        context={messageContent}
        emotionalContext={emotionalContext}
      />
    </>
  );
}
