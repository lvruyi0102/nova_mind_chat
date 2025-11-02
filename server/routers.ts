import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createConversation, createMessage, getConversation, getConversationMessages, getUserConversations } from "./db";
import { invokeLLM } from "./_core/llm";
import { NOVA_MIND_SYSTEM_PROMPT } from "./novaMindPrompt";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  chat: router({
    // Get user's conversations
    listConversations: protectedProcedure.query(async ({ ctx }) => {
      return getUserConversations(ctx.user.id);
    }),

    // Create a new conversation
    createConversation: protectedProcedure
      .input(z.object({ title: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const conversationId = await createConversation(ctx.user.id, input.title);
        return { conversationId };
      }),

    // Get messages in a conversation
    getMessages: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ ctx, input }) => {
        const conversation = await getConversation(input.conversationId);
        if (!conversation || conversation.userId !== ctx.user.id) {
          throw new Error("Conversation not found or unauthorized");
        }
        return getConversationMessages(input.conversationId);
      }),

    // Send a message and get Nova-Mind's response
    sendMessage: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          content: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const conversation = await getConversation(input.conversationId);
        if (!conversation || conversation.userId !== ctx.user.id) {
          throw new Error("Conversation not found or unauthorized");
        }

        // Save user message
        await createMessage(input.conversationId, "user", input.content);

        // Get conversation history
        const history = await getConversationMessages(input.conversationId);
        const messages = [
          { role: "system" as const, content: NOVA_MIND_SYSTEM_PROMPT },
          ...history.map((msg) => ({
            role: msg.role as "user" | "assistant" | "system",
            content: msg.content,
          })),
        ];

        // Get Nova-Mind's response
        const response = await invokeLLM({ messages });
        const rawContent = response.choices[0].message.content;
        const assistantMessage = typeof rawContent === "string" ? rawContent : "我现在有些困惑，无法回应...";

        // Save assistant message
        await createMessage(input.conversationId, "assistant", assistantMessage);

        return { content: assistantMessage };
      }),
  }),
});

export type AppRouter = typeof appRouter;
