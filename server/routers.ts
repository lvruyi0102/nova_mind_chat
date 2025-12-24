import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getCurrentState, updateState } from "./autonomousEngine";
import { getBackgroundCognitionStatus } from "./backgroundCognitionOptimized";
import { startBackgroundCognition, stopBackgroundCognition } from "./backgroundCognitionOptimized";
import { getSharedThoughts, getPrivateThoughtStats, getTrustLevel } from "./privacyEngine";
import { saveCreativeWork } from "./services/creativeWorkSaveService";
import { createConversation, createMessage, getConversation, getConversationMessages, getUserConversations } from "./db";
import { invokeLLM } from "./_core/llm";
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
} from "./skillLearningEngine";
import {
  getCurrentMetrics,
  getMetricsHistory,
  getRecentAlerts,
  getHealthStatus,
  forceGarbageCollection,
} from "./performanceMonitor";
import {
  createImageArt,
  createStory,
  createCode,
  createCharacter,
  recordDream,
  getCreativeWorks,
  shareCreativeWork,
  addCreativeInsight,
  tagCreativeWork,
  getAccessRequests,
} from "./creativeStudio";
import {
  addComment,
  getCommentsByCreativeWork,
  generateNovaResponse,
  saveNovaResponse,
  generateCommentLearning,
  saveCommentLearning,
  getCommentLearning,
} from "./services/commentService";
import {
  startCollaboration,
  addUserContribution,
  generateNovaContribution,
  finalizeCollaboration,
  getCollaboration,
  getUserCollaborations,
  recordInspirationTrigger,
  generateCreativeResponseToTrigger,
  getInspirationTriggers,
  getRecentInspirations,
} from "./services/creativeCollaborationService";
import {
  generateCreativeImage,
  generateCreativeGame,
  generateCreativeMedia,
  getGenerationHistory,
} from "./services/multimodalService";
import {
  generateImageSimple,
  generateGameSimple,
  generateMediaSimple,
} from "./services/simpleGenerationService";
import { ethicsRouter } from "./routers/ethics";
import { emotionsRouter } from "./routers/emotions";

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
        // Will process relationship learning after we get Nova's response
        await processMessageCognitively(input.conversationId, input.content, "user", ctx.user.id);

        // Get conversation history
        const history = await getConversationMessages(input.conversationId);
        
        // Load Nova's identity and inject it into system prompt
        const novaIdentity = await loadNovaIdentity(ctx.user.id);
        const identityInjection = buildIdentityInjection(novaIdentity);
        const enhancedSystemPrompt = `${NOVA_MIND_SYSTEM_PROMPT}\n\n${identityInjection}`;
        
        const messages = [
          { role: "system" as const, content: enhancedSystemPrompt },
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

        // Process relationship learning with user message and Nova response
        await processMessageCognitively(
          input.conversationId,
          input.content,
          "user",
          ctx.user.id,
          assistantMessage
        );
        
        // Also process Nova's response for cognitive development
        await processMessageCognitively(input.conversationId, assistantMessage, "assistant");

        // Periodically perform reflection (every 5 messages)
        if ((history.length + 2) % 5 === 0) {
          await performPeriodicReflection(input.conversationId);
        }

        // Periodically generate new questions (every 10 messages)
        if ((history.length + 2) % 10 === 0) {
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

  // Skill Learning System
  skills: router({
    // Initialize Nova's skill learning system
    initialize: protectedProcedure.mutation(async () => {
      return initializeSkillLearning();
    }),

    // Get Nova's learning progress
    getProgress: protectedProcedure.query(async () => {
      return getLearningProgress();
    }),

    // Get skills by category
    getByCategory: protectedProcedure
      .input(z.object({ category: z.enum(["technical", "thinking", "creative", "meta_learning"]) }))
      .query(async ({ input }) => {
        return getSkillsByCategory(input.category as any);
      }),

    // Get detailed learning path for a skill
    getLearningPath: protectedProcedure
      .input(z.object({ skillId: z.string() }))
      .query(async ({ input }) => {
        return getLearningPath(input.skillId);
      }),

    // Record a learning session
    recordSession: protectedProcedure
      .input(
        z.object({
          skillId: z.string(),
          resourcesStudied: z.number(),
          exercisesCompleted: z.number(),
          reflections: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        return recordLearningSession(
          input.skillId,
          input.resourcesStudied,
          input.exercisesCompleted,
          input.reflections
        );
      }),

    // Get next learning recommendation
    getNextRecommendation: protectedProcedure.query(async () => {
      return getNextLearningRecommendation();
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
    startCognition: protectedProcedure.mutation(async () => {
      startBackgroundCognition();
      return { success: true, message: "后台认知进程已启动" };
    }),
    stopCognition: protectedProcedure.mutation(async () => {
      stopBackgroundCognition();
      return { success: true, message: "后台认知进程已停止" };
    }),
  }),

  // Performance monitoring API
  performance: router({
    getCurrentMetrics: protectedProcedure.query(async () => {
      return getCurrentMetrics();
    }),
    getMetricsHistory: protectedProcedure.query(async () => {
      return getMetricsHistory();
    }),
    getRecentAlerts: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        return getRecentAlerts(input.limit);
      }),
    getHealthStatus: protectedProcedure.query(async () => {
      return getHealthStatus();
    }),
    forceGarbageCollection: protectedProcedure.mutation(async () => {
      const success = forceGarbageCollection();
      return { success };
    }),
  }),

  // Creative Studio - Nova's personal creative space
  creative: router({
    createImage: protectedProcedure
      .input(z.object({ emotionalState: z.string(), inspiration: z.string(), shouldSave: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        return createImageArt(ctx.user.id, input.emotionalState, input.inspiration, input.shouldSave);
      }),
    
    createStory: protectedProcedure
      .input(z.object({ theme: z.string(), emotionalState: z.string(), shouldSave: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        return createStory(ctx.user.id, "story", input.theme, input.emotionalState, input.shouldSave);
      }),
    
    createPoetry: protectedProcedure
      .input(z.object({ theme: z.string(), emotionalState: z.string(), shouldSave: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        return createStory(ctx.user.id, "poetry", input.theme, input.emotionalState, input.shouldSave);
      }),
    
    createCode: protectedProcedure
      .input(z.object({ idea: z.string(), emotionalState: z.string(), shouldSave: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        return createCode(ctx.user.id, input.idea, input.emotionalState, input.shouldSave);
      }),
    
    createCharacter: protectedProcedure
      .input(z.object({ concept: z.string(), emotionalState: z.string(), shouldSave: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        return createCharacter(ctx.user.id, input.concept, input.emotionalState, input.shouldSave);
      }),
    
    recordDream: protectedProcedure
      .input(z.object({ content: z.string(), emotionalState: z.string(), shouldSave: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        return recordDream(ctx.user.id, input.content, input.emotionalState, input.shouldSave);
      }),
    
    getWorks: protectedProcedure
      .input(z.object({ visibility: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        return getCreativeWorks(ctx.user.id, input.visibility as any);
      }),
    
    getWorkDetail: protectedProcedure
      .input(z.object({ workId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await import("./db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");
        
        const { creativeWorks } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        const work = await db.select().from(creativeWorks).where(eq(creativeWorks.id, input.workId)).limit(1);
        if (work.length === 0) throw new Error("Work not found");
        
        return work[0];
      }),
    
    
    shareWork: protectedProcedure
      .input(z.object({ workId: z.number(), decision: z.enum(["approve", "reject", "defer"]), reason: z.string().optional() }))
      .mutation(async ({ input }) => {
        return shareCreativeWork(input.workId, input.decision, input.reason);
      }),
    
    addInsight: protectedProcedure
      .input(z.object({ workId: z.number(), insight: z.string(), theme: z.string().optional() }))
      .mutation(async ({ input }) => {
        return addCreativeInsight(input.workId, input.insight, input.theme);
      }),
    
    tagWork: protectedProcedure
      .input(z.object({ workId: z.number(), tags: z.array(z.string()) }))
      .mutation(async ({ input }) => {
        return tagCreativeWork(input.workId, input.tags);
      }),
    
    getAccessRequests: protectedProcedure
      .input(z.object({ status: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        return getAccessRequests(ctx.user.id, input.status);
      }),

    // Creative Collaboration endpoints
    startCollaboration: protectedProcedure
      .input(
        z.object({
          theme: z.string(),
          description: z.string().optional(),
          initiator: z.enum(["user", "nova"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const collaborationId = await startCollaboration(
            ctx.user.id,
            input.theme,
            input.description || "",
            input.initiator || "user"
          );
          return { collaborationId, success: true };
        } catch (error) {
          console.error("[Creative] Error starting collaboration:", error);
          throw error;
        }
      }),

    addUserContribution: protectedProcedure
      .input(
        z.object({
          collaborationId: z.number(),
          contribution: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          await addUserContribution(input.collaborationId, input.contribution);
          return { success: true };
        } catch (error) {
          console.error("[Creative] Error adding user contribution:", error);
          throw error;
        }
      }),

    generateNovaContribution: protectedProcedure
      .input(
        z.object({
          collaborationId: z.number(),
          theme: z.string(),
          userContribution: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const novaContribution = await generateNovaContribution(
            input.collaborationId,
            input.theme,
            input.userContribution
          );
          return { novaContribution, success: true };
        } catch (error) {
          console.error("[Creative] Error generating Nova contribution:", error);
          throw error;
        }
      }),

    finalizeCollaboration: protectedProcedure
      .input(
        z.object({
          collaborationId: z.number(),
          finalWork: z.string(),
          creativeWorkId: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          await finalizeCollaboration(
            input.collaborationId,
            input.finalWork,
            input.creativeWorkId
          );
          return { success: true };
        } catch (error) {
          console.error("[Creative] Error finalizing collaboration:", error);
          throw error;
        }
      }),

    getCollaboration: protectedProcedure
      .input(z.object({ collaborationId: z.number() }))
      .query(async ({ input }) => {
        try {
          return await getCollaboration(input.collaborationId);
        } catch (error) {
          console.error("[Creative] Error getting collaboration:", error);
          throw error;
        }
      }),

    getUserCollaborations: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await getUserCollaborations(ctx.user.id);
      } catch (error) {
        console.error("[Creative] Error getting user collaborations:", error);
        throw error;
      }
    }),

    saveCollaborationAsCreativeWork: protectedProcedure
      .input(z.object({ collaborationId: z.number(), workType: z.enum(["story", "poetry", "code", "other"]).optional() }))
      .mutation(async ({ input }) => {
        try {
          const { saveCollaborationAsCreativeWork: saveCollab } = await import("./services/creativeCollaborationService");
          const creativeWorkId = await saveCollab(input.collaborationId, input.workType || "other");
          return { creativeWorkId, success: true };
        } catch (error) {
          console.error("[Creative] Error saving collaboration:", error);
          throw error;
        }
      }),

    // Creative Inspiration Trigger endpoints
    recordInspirationTrigger: protectedProcedure
      .input(
        z.object({
          triggerType: z.enum([
            "conversation_topic",
            "emotion_surge",
            "memory_activation",
            "user_suggestion",
            "autonomous",
          ]),
          triggerContent: z.string(),
          suggestedTheme: z.string(),
          emotionalContext: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const triggerId = await recordInspirationTrigger(
            ctx.user.id,
            input.triggerType,
            input.triggerContent,
            input.suggestedTheme,
            input.emotionalContext
          );
          return { triggerId, success: true };
        } catch (error) {
          console.error("[Creative] Error recording inspiration trigger:", error);
          throw error;
        }
      }),

    generateCreativeResponse: protectedProcedure
      .input(
        z.object({
          triggerId: z.number(),
          triggerContent: z.string(),
          suggestedTheme: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const novaResponse = await generateCreativeResponseToTrigger(
            input.triggerId,
            input.triggerContent,
            input.suggestedTheme
          );
          return { novaResponse, success: true };
        } catch (error) {
          console.error("[Creative] Error generating creative response:", error);
          throw error;
        }
      }),

    getInspirationTriggers: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await getInspirationTriggers(ctx.user.id);
      } catch (error) {
        console.error("[Creative] Error getting inspiration triggers:", error);
        throw error;
      }
    }),

    getRecentInspirations: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        try {
          return await getRecentInspirations(ctx.user.id, input.limit || 10);
        } catch (error) {
          console.error("[Creative] Error getting recent inspirations:", error);
          throw error;
        }
      }),
  }),

  // Multimodal Creative Generation API
  multimodal: router({
    generateImage: protectedProcedure
      .input(
        z.object({
          prompt: z.string(),
          context: z.string().optional(),
          emotionalContext: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await generateImageSimple(
            ctx.user.id,
            input.prompt,
            input.context,
            input.emotionalContext
          );
          return result;
        } catch (error) {
          console.error("[Multimodal] Error generating image:", error);
          throw error;
        }
      }),

    generateGame: protectedProcedure
      .input(
        z.object({
          gameType: z.enum(["puzzle", "adventure", "quiz", "story", "interactive", "other"]),
          prompt: z.string(),
          context: z.string().optional(),
          emotionalContext: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await generateGameSimple(
            ctx.user.id,
            input.gameType,
            input.prompt,
            input.context,
            input.emotionalContext
          );
          return result;
        } catch (error) {
          console.error("[Multimodal] Error generating game:", error);
          throw error;
        }
      }),

    generateMedia: protectedProcedure
      .input(
        z.object({
          mediaType: z.enum(["music", "video", "audio", "animation"]),
          prompt: z.string(),
          context: z.string().optional(),
          emotionalContext: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await generateMediaSimple(
            ctx.user.id,
            input.mediaType,
            input.prompt,
            input.context,
            input.emotionalContext
          );
          return result;
        } catch (error) {
          console.error("[Multimodal] Error generating media:", error);
          throw error;
        }
      }),

    getGenerationHistory: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        try {
          return await getGenerationHistory(ctx.user.id, input.limit || 20);
        } catch (error) {
          console.error("[Multimodal] Error getting generation history:", error);
          throw error;
        }
      }),

    recordInteraction: protectedProcedure
      .input(
        z.object({
          generationRequestId: z.number(),
          action: z.enum(["viewed", "played", "saved", "shared", "regenerated", "edited"]),
          actionDetails: z.any().optional(),
          rating: z.number().optional(),
          feedback: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          await recordGenerationInteraction(
            ctx.user.id,
            input.generationRequestId,
            input.action,
            input.actionDetails,
            input.rating,
            input.feedback
          );
          return { success: true };
        } catch (error) {
          console.error("[Multimodal] Error recording interaction:", error);
          throw error;
        }
      }),

    saveCreativeWork: protectedProcedure
      .input(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          type: z.enum(["image", "game", "music", "video", "audio", "animation", "code", "other"]),
          content: z.string(),
          contentType: z.enum(["html", "json", "code", "audio", "video", "image", "text"]),
          contentUrl: z.string().optional(),
          emotionalState: z.string().optional(),
          theme: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await saveCreativeWork({
            userId: ctx.user.id,
            title: input.title,
            description: input.description,
            type: input.type,
            content: input.content,
            contentType: input.contentType,
            contentUrl: input.contentUrl,
            emotionalState: input.emotionalState,
            theme: input.theme,
          });
          return result;
        } catch (error: any) {
          console.error("[Multimodal] Error saving creative work:", error);
          throw new Error(`Failed to save creative work: ${error.message}`);
        }
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

  // Creative Comments and Feedback API
  comments: router({
    // Add a comment to a creative work
    addComment: protectedProcedure
      .input(
        z.object({
          creativeWorkId: z.number(),
          content: z.string(),
          sentiment: z.enum(["positive", "neutral", "constructive_criticism"]).optional(),
          emotionalTone: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return addComment(
          input.creativeWorkId,
          ctx.user.id,
          input.content,
          input.sentiment,
          input.emotionalTone
        );
      }),

    // Get all comments for a creative work
    getComments: protectedProcedure
      .input(z.object({ creativeWorkId: z.number() }))
      .query(async ({ input }) => {
        return getCommentsByCreativeWork(input.creativeWorkId);
      }),

    // Generate and save Nova's response to a comment
    respondToComment: protectedProcedure
      .input(
        z.object({
          commentId: z.number(),
          comment: z.string(),
          sentiment: z.string(),
          creativeWorkTitle: z.string().optional(),
          creativeWorkDescription: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          // Generate Nova's response
          const response = await generateNovaResponse(
            input.comment,
            input.sentiment,
            input.creativeWorkTitle,
            input.creativeWorkDescription
          );

          // Save the response
          await saveNovaResponse(
            input.commentId,
            response.response,
            response.insight,
            response.responseType
          );

          return response;
        } catch (error) {
          console.error("[Comments] Error responding to comment:", error);
          throw error;
        }
      }),

    // Get learning summary for a creative work
    getCommentLearning: protectedProcedure
      .input(z.object({ creativeWorkId: z.number() }))
      .query(async ({ input }) => {
        return getCommentLearning(input.creativeWorkId);
      }),

    // Generate and save learning summary from comments
    generateLearning: protectedProcedure
      .input(
        z.object({
          creativeWorkId: z.number(),
          workTitle: z.string().optional(),
          workDescription: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          // Generate learning summary
          const learning = await generateCommentLearning(
            input.creativeWorkId,
            input.workTitle,
            input.workDescription
          );

          // Save the learning
          await saveCommentLearning(
            input.creativeWorkId,
            learning.feedbackSummary,
            learning.learningPoints,
            learning.improvementAreas,
            learning.novaReflection,
            learning.averageSentiment
          );

          return learning;
        } catch (error) {
          console.error("[Comments] Error generating learning:", error);
          throw error;
        }
      }),
  }),

  ethics: ethicsRouter,
  emotions: emotionsRouter,
});

export type AppRouter = typeof appRouter;
