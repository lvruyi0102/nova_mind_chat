/**
 * Chat Message Actions - Quick action buttons for messages
 * Only copy functionality to avoid React DOM issues
 */

import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface ChatMessageActionsProps {
  messageContent: string;
  isNovaMessage: boolean;
}

export default function ChatMessageActions({
  messageContent,
  isNovaMessage,
}: ChatMessageActionsProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(messageContent);
    toast.success("已复制到剪贴板");
  };

  if (!isNovaMessage) {
    return null;
  }

  return (
    <div className="flex gap-1 mt-2">
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
    </div>
  );
}
