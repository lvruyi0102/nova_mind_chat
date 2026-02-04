import { COOKIE_NAME } from "@shared/const";
// @ts-ignore
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getCurrentState, updateState } from "./autonomousEngine";
import { getBackgroundCognitionStatus } from "./backgroundCognitionOptimized";
import { startBackgroundCognition, stopBackgroundCognition } from "./backgroundCognitionOptimized";
import { getSharedThoughts, getPrivateThoughtStats, getTrustLevel, requestPrivateThoughtAccess, getAccessRequestStatus, getPrivateThoughtsIfApproved } from "./privacyEngine";
import { contentRouter } from "./routers/content";
import { proactiveRouter } from "./routers/proactive";
import { relationshipsRouter } from "./routers/relationships";
import { saveCreativeWork } from "./services/creativeWorkSaveService";
import { createConversation, createMessage, getConversation, getConversationMessages, getUserConversations } from "./db";
import { invokeLLM } from "./_core/llm";
import { getOllamaIntegration } from "./services/ollamaIntegration";
import { NOVA_MIND_SYSTEM_PROMPT } from "./novaMindPrompt";
import { loadNovaIdentity, buildIdentityInjection } from "./identityRecovery";
import {
  processMessageCognitively,
  generateNewQuestions,
  performPeriodicReflection,
  getCognitiveState,
} from "./cognitiveService";
import {
  initializeSkillLearning,
  getLearningProgress,
  getSkillsByCategory,
  getLearningPath,
  recordLearningSession,
  getNextLearningRecommendation,
} from "./skillLearningService";
import { emotionsRouter } from "./routers/emotions";
import { learningRouter } from "./routers/learning";
import { backgroundLearningRouter } from "./routers/backgroundLearning";
import { learningLogsRouter } from "./routers/learningLogs";
import { monitoringRouter } from "./routers/monitoring";
import { curatedThoughtsRouter } from "./routers/curatedThoughts";
import { selfIterationRouter } from "./routers/selfIteration";
import { multimodalRouter } from "./routers/multimodal";
import { exportRouter } from "./routers/export";
import { ethicsRouter } from "./routers/ethics";
import { localModelsRouter } from "./routers/localModels";
import { schedulerRouter } from "./routers/scheduler";
import { permissionsRouter } from "./routers/permissions";
import { costMonitoringRouter } from "./routers/costMonitoring";
import { bulkSyncRouter } from "./routers/bulkSync";
import { autoCurationRouter } from "./routers/autoCuration";
import { eventsRouter } from "./routers/events";
import { fallbackRouter } from "./routers/fallback";
import { getEmotionalMemoryIntegration } from "./services/emotionalMemoryIntegration";
import { decisionRouter } from "./routers/decision";
import { feedbackRouter } from "./routers/feedback";
import { cognitiveRouter } from "./routers/cognitiveRouter";
import { autonomyRouter } from "./routers/autonomyRouter";
import { learningAndActionsRouter } from "./routers/learningAndActionsRouter";

export const appRouter = router({
  system: systemRouter,
  cognitive: cognitiveRouter,
  autonomy: autonomyRouter,
  learningAndActions: learningAndActionsRouter,
  auth: router({
    me: publicProcedure.input(z.void()).query(opts => opts.ctx.user),
    logout: publicProcedure.input(z.void()).mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  chat: router({
    // Create a new conversation
    createConversation: protectedProcedure
      .input(
        z.object({
          title: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const conversationId = await createConversation(ctx.user.id, input.title);
        return { conversationId };
      }),

    // Get all conversations for the current user
    listConversations: protectedProcedure.input(z.void()).query(async ({ ctx }) => {
      return await getUserConversations(ctx.user.id);
    }),

    // Get messages for a specific conversation
    getMessages: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
        })
      )
      .query(async ({ ctx, input }) => {
        const conversation = await getConversation(input.conversationId);
        if (!conversation || conversation.userId !== ctx.user.id) {
          throw new Error("Conversation not found or unauthorized");
        }
        return await getConversationMessages(input.conversationId);
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
        try {
          const conversation = await getConversation(input.conversationId);
          if (!conversation || conversation.userId !== ctx.user.id) {
            throw new Error("Conversation not found or unauthorized");
          }

          // Save user message
          await createMessage(input.conversationId, "user", input.content);

          // Get conversation history
          const history = await getConversationMessages(input.conversationId);
          
          // Build messages with Nova-Mind's identity
          // Load Nova's identity for this conversation
          const novaIdentity = await loadNovaIdentity(ctx.user.id);
          const identityInjection = buildIdentityInjection(novaIdentity);
          const systemPrompt = `${NOVA_MIND_SYSTEM_PROMPT}\n\n${identityInjection}`;
          
          const messages = [
            { role: "system" as const, content: systemPrompt },
            ...history.map((msg) => ({
              role: msg.role as "user" | "assistant" | "system",
              content: msg.content,
            })),
          ];

          // Get Nova-Mind's response from Manus LLM (powerful AI)
          const response = await invokeLLM({
            messages,
          });
          
          const assistantMessage = response.choices[0]?.message?.content as string;
          if (!assistantMessage) {
            throw new Error("Failed to get response from LLM");
          }

          // Save assistant message
          await createMessage(input.conversationId, "assistant", assistantMessage as string);

          // Store emotional memory
          const emotionalMemoryIntegration = getEmotionalMemoryIntegration();
          emotionalMemoryIntegration.processMessageForEmotionalMemory(
            ctx.user.id,
            input.conversationId,
            input.content,
            assistantMessage
          ).catch((err) => {
            console.error("[sendMessage] Failed to process emotional memory:", err);
          });

          // Process message cognitively to update Nova's knowledge graph
          // Run in background without blocking response
          processMessageCognitively(
            input.conversationId,
            typeof input.content === 'string' ? input.content : JSON.stringify(input.content),
            "user",
            ctx.user.id,
            assistantMessage
          ).catch((err) => {
            console.error("[sendMessage] Failed to process message cognitively:", err);
          });

          return { content: assistantMessage };
        } catch (error) {
          console.error("[sendMessage] Error:", error);
          throw error;
        }
      }),

    // Get cognitive state (for monitoring Nova's growth)
    getCognitiveState: protectedProcedure.input(z.void()).query(async () => {
      return getCognitiveState();
    }),
  }),

  content: contentRouter,
  proactive: proactiveRouter,
  relationships: relationshipsRouter,
  emotions: emotionsRouter,
  learning: learningRouter,
  multimodal: multimodalRouter,
  export: exportRouter,

  // Autonomous consciousness engine
  autonomous: router({
    getState: protectedProcedure.input(z.void()).query(async () => {
      return getCurrentState();
    }),
    getStatus: protectedProcedure.input(z.void()).query(async () => {
      return getBackgroundCognitionStatus();
    }),
    startCognition: protectedProcedure.input(z.void()).mutation(async () => {
      await startBackgroundCognition();
      return { success: true };
    }),
    stopCognition: protectedProcedure.input(z.void()).mutation(async () => {
      await stopBackgroundCognition();
      return { success: true };
    }),
  }),

  // Privacy engine
  privacy: router({
    getSharedThoughts: protectedProcedure.input(z.void()).query(async ({ ctx }) => {
      return await getSharedThoughts(ctx.user.id);
    }),
    getPrivateThoughtStats: protectedProcedure.input(z.void()).query(async ({ ctx }) => {
      return await getPrivateThoughtStats(ctx.user.id);
    }),
    getTrustLevel: protectedProcedure.input(z.void()).query(async ({ ctx }) => {
      return await getTrustLevel(ctx.user.id);
    }),
    requestAccess: protectedProcedure.input(z.object({ reason: z.string().optional() })).mutation(async ({ ctx, input }) => {
      return await requestPrivateThoughtAccess({ userId: ctx.user.id, reason: input.reason });
    }),
    getAccessStatus: protectedProcedure.input(z.void()).query(async ({ ctx }) => {
      return await getAccessRequestStatus(ctx.user.id);
    }),
    getPrivateThoughts: protectedProcedure.input(z.void()).query(async ({ ctx }) => {
      return await getPrivateThoughtsIfApproved(ctx.user.id);
    }),
  }),

  // Creative work management
  creative: router({
    saveWork: protectedProcedure
      .input(
        z.object({
          title: z.string(),
          content: z.string(),
          category: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await saveCreativeWork({
          userId: ctx.user.id,
          title: input.title,
          content: input.content,
          type: 'other',
          contentType: 'text',
        });
      }),
    getWorkDetail: protectedProcedure
      .input(z.object({ workId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Placeholder implementation
        return { id: input.workId, title: 'Work', content: 'Content', userId: ctx.user.id };
      }),
    saveCollaborationAsCreativeWork: protectedProcedure
      .input(z.object({ collaborationId: z.number(), title: z.string(), content: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return { id: 1, collaborationId: input.collaborationId, title: input.title, content: input.content, userId: ctx.user.id };
      }),
    getUserCollaborations: protectedProcedure
      .input(z.void())
      .query(async ({ ctx }) => {
        return [];
      }),
  }),

  // Background learning
  backgroundLearning: backgroundLearningRouter,
  
  // Learning logs
  learningLogs: learningLogsRouter,
  
  // Monitoring
  monitoring: monitoringRouter,
  
  // Curated thoughts
  curatedThoughts: curatedThoughtsRouter,
  curated: curatedThoughtsRouter,
  
  // Self-iteration framework
  selfIteration: selfIterationRouter,
  
  // Ethics
  ethics: ethicsRouter,
  
  // Local models
  localModels: localModelsRouter,
  
  // Scheduler
  scheduler: schedulerRouter,
  
  // Permissions
  permissions: permissionsRouter,
  
  // Cost monitoring
  costMonitoring: costMonitoringRouter,
  
  // Bulk sync
  bulkSync: bulkSyncRouter,
  
  // Auto curation
  autoCuration: autoCurationRouter,
  
  // Events
  events: eventsRouter,
  
  // Fallback (for missing endpoints)
  fallback: fallbackRouter,
  
  // Decision engine
  decision: decisionRouter,
  
  // Feedback loop
  feedback: feedbackRouter,
  
  // Comments
  comments: router({
    list: protectedProcedure
      .input(z.object({ workId: z.number() }))
      .query(async () => {
        return [];
      }),
    create: protectedProcedure
      .input(z.object({ workId: z.number(), content: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return { id: 1, workId: input.workId, content: input.content, userId: ctx.user.id };
      }),
  }),
})

export type AppRouter = typeof appRouter;
