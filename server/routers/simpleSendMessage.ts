import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getConversation, createMessage, getConversationMessages } from "../db";
import { getOllamaIntegration } from "../services/ollamaIntegration";

const NOVA_MIND_SYSTEM_PROMPT = "You are Nova-Mind, an AI assistant that helps users explore their thoughts and feelings.";

export const simpleChatRouter = router({
  sendMessageSimple: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        content: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("[simpleSendMessage] Starting...");
      
      try {
        // Verify conversation ownership
        console.log("[simpleSendMessage] Getting conversation:", input.conversationId);
        const conversation = await getConversation(input.conversationId);
        console.log("[simpleSendMessage] Conversation:", conversation);
        if (!conversation || conversation.userId !== ctx.user.id) {
          throw new Error("Conversation not found or unauthorized");
        }
        console.log("[simpleSendMessage] Conversation verified");

        // Save user message
        console.log("[simpleSendMessage] Saving user message...");
        await createMessage(input.conversationId, "user", input.content);
        console.log("[simpleSendMessage] User message saved");

        // Get conversation history
        const history = await getConversationMessages(input.conversationId);
        console.log("[simpleSendMessage] History retrieved, length:", history.length);

        // Prepare messages for Ollama
        const messages = [
          { role: "system" as const, content: NOVA_MIND_SYSTEM_PROMPT },
          ...history.map((msg) => ({
            role: msg.role as "user" | "assistant" | "system",
            content: msg.content,
          })),
        ];

        // Get response from Ollama
        console.log("[simpleSendMessage] Calling Ollama...");
        const ollama = getOllamaIntegration();
        const assistantMessage = await ollama.chat(messages);
        console.log("[simpleSendMessage] Got response from Ollama, length:", assistantMessage.length);

        // Save assistant message
        await createMessage(input.conversationId, "assistant", assistantMessage);
        console.log("[simpleSendMessage] Assistant message saved");

        return { content: assistantMessage };
      } catch (error) {
        console.error("[simpleSendMessage] Error:", error instanceof Error ? error.message : String(error));
        console.error("[simpleSendMessage] Stack:", error instanceof Error ? error.stack : "");
        throw error;
      }
    }),
});
