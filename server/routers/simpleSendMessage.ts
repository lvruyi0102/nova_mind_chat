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
        const conversation = await getConversation(input.conversationId);
        if (!conversation || conversation.userId !== ctx.user.id) {
          throw new Error("Conversation not found or unauthorized");
        }
        console.log("[simpleSendMessage] Conversation verified");

        // Save user message
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
        const isAvailable = await ollama.isAvailable();
        
        if (!isAvailable) {
          console.error("[simpleSendMessage] Ollama not available");
          throw new Error("Ollama service is not available");
        }

        const assistantMessage = await ollama.chat(messages);
        console.log("[simpleSendMessage] Got response from Ollama");

        // Save assistant message
        await createMessage(input.conversationId, "assistant", assistantMessage);
        console.log("[simpleSendMessage] Assistant message saved");

        return { content: assistantMessage };
      } catch (error) {
        console.error("[simpleSendMessage] Error:", error);
        throw error;
      }
    }),
});
