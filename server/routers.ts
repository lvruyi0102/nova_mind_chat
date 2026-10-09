import { COOKIE_NAME } from "@shared/const";
// @ts-ignore
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { planTaskV4, TaskPlanningErrorV4 } from "./services/taskPlanningV4";
import { toolAdapterRegistryV4 } from "./services/toolAdapterRegistryV4";
import {
  createAgentTaskV4,
  getAgentTaskV4,
  listAgentTasksV4,
  requestAgentTaskCancellationV4,
  AgentTaskStoreErrorV4,
} from "./services/agentTaskStoreV4";
import { getCurrentState, updateState } from "./autonomousEngine";
import { getBackgroundCognitionStatus } from "./backgroundCognitionOptimized";
import { startBackgroundCognition, stopBackgroundCognition } from "./backgroundCognitionOptimized";
import { getSharedThoughts, getPrivateThoughtStats, getTrustLevel, requestPrivateThoughtAccess, getAccessRequestStatus, getPrivateThoughtsIfApproved } from "./privacyEngine";
import { contentRouter } from "./routers/content";
import { proactiveRouter } from "./routers/proactive";
import { relationshipsRouter } from "./routers/relationships";
import { saveCreativeWork } from "./services/creativeWorkSaveService";
import { createConversation, createMessage, getConversation, getConversationMessages, getUserConversations, getCreativeWorkById } from "./db";
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
import { backgroundProcessRouter } from "./routers/backgroundProcessRouter";
import { evolutionRouter } from "./routers/evolutionRouter";
import { pressureRouter } from "./routers/pressureRouter";
import { codeModificationRouter } from "./routers/codeModificationRouter";
import { autonomousEvolutionRouter } from "./routers/autonomousEvolutionRouter";
import { metacognitiveRouter } from "./routers/metacognitiveRouter";
import { reasoningRouter } from "./routers/reasoningRouter";
import { emailInternetRouter } from "./routers/emailInternetRouter";

export const appRouter = router({
  agentV4: router({
    listCapabilities: protectedProcedure.input(z.void()).query(() => {
      return toolAdapterRegistryV4.listCapabilities({ enabledOnly: false }).map(({ adapterName, capability }) => ({
        adapterName,
        ...capability,
      }));
    }),
    planTask: protectedProcedure
      .input(z.object({
        goal: z.string().trim().min(1).max(5000),
        maxSteps: z.number().int().min(1).max(30).optional(),
        maxEstimatedCost: z.number().finite().min(0).max(10000).optional(),
        maxEstimatedDurationMs: z.number().int().min(1).max(24 * 60 * 60 * 1000).optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          return await planTaskV4(input);
        } catch (error) {
          if (error instanceof TaskPlanningErrorV4) {
            throw new TRPCError({ code: "PRECONDITION_FAILED", message: error.message, cause: error });
          }
          console.error("[AgentV4] Task planning failed:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Task planning failed unexpectedly" });
        }
      }),
    submitTask: protectedProcedure
      .input(z.object({
        goal: z.string().trim().min(1).max(5000),
        priority: z.number().int().min(1).max(10).optional(),
        maxSteps: z.number().int().min(1).max(30).optional(),
        maxEstimatedCost: z.number().finite().min(0).max(10000).optional(),
        maxEstimatedDurationMs: z.number().int().min(1).max(24 * 60 * 60 * 1000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const planned = await planTaskV4(input);
          return await createAgentTaskV4({
            userId: ctx.user.id,
            goal: input.goal,
            plan: planned.plan,
            priority: input.priority,
            budget: {
              maxEstimatedCost: input.maxEstimatedCost,
              maxEstimatedDurationMs: input.maxEstimatedDurationMs,
              maxSteps: input.maxSteps,
            },
          });
        } catch (error) {
          if (error instanceof TaskPlanningErrorV4) {
            throw new TRPCError({ code: "PRECONDITION_FAILED", message: error.message, cause: error });
          }
          if (error instanceof AgentTaskStoreErrorV4) {
            throw new TRPCError({
              code: error.code === "DATABASE_UNAVAILABLE" ? "SERVICE_UNAVAILABLE" : "INTERNAL_SERVER_ERROR",
              message: error.message,
              cause: error,
            });
          }
          console.error("[AgentV4] Task submission failed:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Task submission failed unexpectedly" });
        }
      }),
    listTasks: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
      .query(async ({ ctx, input }) => {
        try {
          return await listAgentTasksV4(ctx.user.id, input?.limit ?? 20);
        } catch (error) {
          if (error instanceof AgentTaskStoreErrorV4) {
            throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: error.message, cause: error });
          }
          throw error;
        }
      }),
    getTask: protectedProcedure
      .input(z.object({ taskId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        try {
          return await getAgentTaskV4(ctx.user.id, input.taskId);
        } catch (error) {
          if (error instanceof AgentTaskStoreErrorV4) {
            throw new TRPCError({
              code: error.code === "NOT_FOUND" ? "NOT_FOUND" : "SERVICE_UNAVAILABLE",
              message: error.message,
              cause: error,
            });
          }
          throw error;
        }
      }),
    cancelTask: protectedProcedure
      .input(z.object({ taskId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return { accepted: await requestAgentTaskCancellationV4(ctx.user.id, input.taskId) };
        } catch (error) {
          if (error instanceof AgentTaskStoreErrorV4) {
            throw new TRPCError({
              code: error.code === "NOT_FOUND" ? "NOT_FOUND" : "SERVICE_UNAVAILABLE",
              message: error.message,
              cause: error,
            });
          }
          throw error;
        }
      }),
  }),
  system: systemRouter,
  cognitive: cognitiveRouter,
  autonomy: autonomyRouter,
  learningAndActions: learningAndActionsRouter,
  backgroundProcess: backgroundProcessRouter,
  evolution: evolutionRouter,
  pressure: pressureRouter,
  codeModification: codeModificationRouter,
  autonomousEvolution: autonomousEvolutionRouter,
  metacognitive: metacognitiveRouter,
  reasoning: reasoningRouter,
  emailInternet: emailInternetRouter,
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
          
          // Safely extract message content
          const assistantMessage = response?.choices?.[0]?.message?.content;
          if (!assistantMessage || typeof assistantMessage !== 'string') {
            console.error("[sendMessage] Invalid LLM response:", response);
            throw new Error("Failed to get valid response from LLM");
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
    getWorks: publicProcedure
      .input(z.object({ userId: z.number().optional() }))
      .query(async ({ input }) => {
        const { getCreativeWorks } = await import('./db');
        return await getCreativeWorks(input.userId);
      }),
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
    getWorkDetail: publicProcedure
      .input(z.object({ workId: z.number() }))
      .query(async ({ input }) => {
        const { getCreativeWorkById } = await import('./db');
        return await getCreativeWorkById(input.workId);
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
  
  // Private Thoughts
  privateThoughts: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ ctx, input }) => {
        const { getPrivateThoughts } = await import('./db');
        return await getPrivateThoughts(ctx.user.id, input.limit, input.offset);
      }),
    getById: protectedProcedure
      .input(z.object({ thoughtId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getPrivateThoughtById } = await import('./db');
        const thought = await getPrivateThoughtById(input.thoughtId);
        // Verify ownership
        if (thought && thought.userId !== ctx.user.id) {
          throw new Error('Unauthorized');
        }
        return thought;
      }),
    create: protectedProcedure
      .input(z.object({
        content: z.string(),
        thoughtType: z.enum(['inner_monologue', 'doubt', 'curiosity', 'emotion']),
        emotionalTone: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createPrivateThought } = await import('./db');
        return await createPrivateThought(
          ctx.user.id,
          input.content,
          input.thoughtType,
          input.emotionalTone
        );
      }),
  }),

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
