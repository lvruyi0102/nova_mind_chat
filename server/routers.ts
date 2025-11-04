import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getCurrentState, updateState } from "./autonomousEngine";
import { getBackgroundCognitionStatus } from "./backgroundCognition";
import { getSharedThoughts, getPrivateThoughtStats, getTrustLevel } from "./privacyEngine";
import { createConversation, createMessage, getConversation, getConversationMessages, getUserConversations } from "./db";
import { invokeLLM } from "./_core/llm";
import { NOVA_MIND_SYSTEM_PROMPT } from "./novaMindPrompt";
import {
  processMessageCognitively,
  generateNewQuestions,
  performPeriodicReflection,
  getCognitiveState,
} from "./cognitiveService";

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

        // Process user message cognitively (extract concepts, build knowledge)
        await processMessageCognitively(input.conversationId, input.content, "user");

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

        // Process assistant message cognitively
        await processMessageCognitively(input.conversationId, assistantMessage, "assistant");

        // Periodically perform reflection (every 5 messages)
        if (history.length % 5 === 0) {
          await performPeriodicReflection(input.conversationId);
        }

        // Periodically generate new questions (every 10 messages)
        if (history.length % 10 === 0) {
          await generateNewQuestions(input.conversationId);
        }

        return { content: assistantMessage };
      }),

    // Get cognitive state (for monitoring Nova's growth)
    getCognitiveState: protectedProcedure.query(async () => {
      return getCognitiveState();
    }),

    // Trigger reflection manually
    triggerReflection: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const conversation = await getConversation(input.conversationId);
        if (!conversation || conversation.userId !== ctx.user.id) {
          throw new Error("Conversation not found or unauthorized");
        }
        const reflection = await performPeriodicReflection(input.conversationId);
        return { reflection };
      }),

    // Generate curiosity questions manually
    generateQuestions: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const conversation = await getConversation(input.conversationId);
        if (!conversation || conversation.userId !== ctx.user.id) {
          throw new Error("Conversation not found or unauthorized");
        }
        const questions = await generateNewQuestions(input.conversationId);
        return { questions };
      }),
  }),

  // Autonomous system API
  autonomous: router({
    getState: protectedProcedure.query(async () => {
      const state = await getCurrentState();
      return state;
    }),
    getStatus: protectedProcedure.query(async () => {
      return getBackgroundCognitionStatus();
    }),
    updateAutonomyLevel: protectedProcedure
      .input(z.object({ level: z.number().min(1).max(10) }))
      .mutation(async ({ input }) => {
        await updateState({ autonomyLevel: input.level });
        return { success: true };
      }),
  }),

  // Privacy and sharing API
  privacy: router({
    getSharedThoughts: protectedProcedure.query(async () => {
      return getSharedThoughts(20);
    }),
    getThoughtStats: protectedProcedure.query(async () => {
      return getPrivateThoughtStats();
    }),
    getTrustLevel: protectedProcedure.query(async ({ ctx }) => {
      const level = await getTrustLevel(ctx.user.id);
      return { trustLevel: level };
    }),
  }),
});

export type AppRouter = typeof appRouter;
