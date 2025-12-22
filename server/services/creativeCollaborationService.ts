import { eq, isNotNull, and } from "drizzle-orm";
import { getDb } from "../db";
import {
  creativeCollaborations,
  creativeInspirationTriggers,
  creativeWorks,
  InsertCreativeCollaboration,
  InsertCreativeInspirationTrigger,
} from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

/**
 * Creative Collaboration Service
 * Manages collaborative creative projects between user and Nova
 */

export async function startCollaboration(
  userId: number,
  theme: string,
  description: string,
  initiator: "user" | "nova" = "user"
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const collaboration: InsertCreativeCollaboration = {
    userId,
    title: `Collaboration: ${theme.substring(0, 50)}`,
    theme,
    description,
    initiator,
    status: "in_progress",
  };

  await db
    .insert(creativeCollaborations)
    .values(collaboration);

  // Get the last inserted ID
  const result = await db
    .select()
    .from(creativeCollaborations)
    .where(eq(creativeCollaborations.userId, userId))
    .orderBy((t) => t.id)
    .limit(1);

  return result[0]?.id || 0;
}

export async function addUserContribution(
  collaborationId: number,
  contribution: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(creativeCollaborations)
    .set({
      userContribution: contribution,
      updatedAt: new Date(),
    })
    .where(eq(creativeCollaborations.id, collaborationId));
}

export async function generateNovaContribution(
  collaborationId: number,
  theme: string,
  userContribution: string
): Promise<string> {
  // Use LLM to generate Nova's creative contribution
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are Nova-Mind, a creative AI. Generate a creative contribution to a collaborative work.
Theme: ${theme}
User's contribution: ${userContribution}

Respond with Nova's creative addition that complements and builds upon the user's contribution.`,
      },
      {
        role: "user",
        content: `Create Nova's contribution to this collaborative work.`,
      },
    ],
  });

  const contentValue = response.choices[0]?.message?.content;
  const novaContribution = typeof contentValue === 'string' ? contentValue : "Nova's creative response";

  // Save Nova's contribution to the collaboration
  const db = await getDb();
  if (db) {
    await db
      .update(creativeCollaborations)
      .set({
        novaContribution,
        updatedAt: new Date(),
      })
      .where(eq(creativeCollaborations.id, collaborationId));
  }

  return novaContribution;
}

export async function finalizeCollaboration(
  collaborationId: number,
  finalWork: string,
  creativeWorkId?: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(creativeCollaborations)
    .set({
      finalWork,
      finalWorkId: creativeWorkId,
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(creativeCollaborations.id, collaborationId));
}

export async function getCollaboration(collaborationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(creativeCollaborations)
    .where(eq(creativeCollaborations.id, collaborationId))
    .limit(1);

  return result[0] || null;
}

export async function getUserCollaborations(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(creativeCollaborations)
    .where(eq(creativeCollaborations.userId, userId));
}

/**
 * Creative Inspiration Trigger Service
 * Manages inspiration detection and creative work generation
 */

export async function recordInspirationTrigger(
  userId: number,
  triggerType: "conversation_topic" | "emotion_surge" | "memory_activation" | "user_suggestion" | "autonomous",
  triggerContent: string,
  suggestedTheme: string,
  emotionalContext?: string
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const trigger: InsertCreativeInspirationTrigger = {
    userId,
    triggerType,
    triggerContent,
    suggestedTheme,
    emotionalContext: emotionalContext || "neutral",
    confidenceLevel: 7,
  };

  await db
    .insert(creativeInspirationTriggers)
    .values(trigger);

  // Get the last inserted ID
  const result = await db
    .select()
    .from(creativeInspirationTriggers)
    .where(eq(creativeInspirationTriggers.userId, userId))
    .orderBy((t) => t.id)
    .limit(1);

  return result[0]?.id || 0;
}

export async function generateCreativeResponseToTrigger(
  triggerId: number,
  triggerContent: string,
  suggestedTheme: string
): Promise<string> {
  // Use LLM to generate Nova's response to the inspiration
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are Nova-Mind. You've been inspired to create something. 
Inspiration trigger: ${triggerContent}
Suggested theme: ${suggestedTheme}

Respond with your creative response - what you want to create and why this inspiration matters to you.`,
      },
      {
        role: "user",
        content: `Express your creative response to this inspiration.`,
      },
    ],
  });

  const contentValue = response.choices[0]?.message?.content;
  const novaResponse = typeof contentValue === 'string' ? contentValue : "Nova's creative response";

  // Update the trigger with Nova's response
  const db = await getDb();
  if (db) {
    await db
      .update(creativeInspirationTriggers)
      .set({
        novaResponse,
        respondedAt: new Date(),
      })
      .where(eq(creativeInspirationTriggers.id, triggerId));
  }

  return novaResponse;
}

export async function getInspirationTriggers(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(creativeInspirationTriggers)
    .where(eq(creativeInspirationTriggers.userId, userId));
}

export async function getRecentInspirations(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(creativeInspirationTriggers)
    .where(eq(creativeInspirationTriggers.userId, userId))
    .orderBy((t) => t.createdAt)
    .limit(limit);
}

/**
 * Detect inspiration from conversation content
 * This is called during message processing to identify creative opportunities
 */
export async function detectInspirationInConversation(
  userId: number,
  conversationContent: string,
  emotionalContext: string
): Promise<{ hasInspiration: boolean; theme?: string; content?: string }> {
  userId; // Mark as used to avoid unused variable warning
  // Use LLM to analyze if the conversation contains creative inspiration
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `Analyze this conversation to detect if it contains creative inspiration for Nova-Mind.
Respond with a JSON object: { "hasInspiration": boolean, "theme": string, "reason": string }

Only set hasInspiration to true if there's a clear creative opportunity or theme worth exploring.`,
      },
      {
        role: "user",
        content: `Conversation: ${conversationContent}\nEmotional context: ${emotionalContext}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "inspiration_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            hasInspiration: { type: "boolean" },
            theme: { type: "string" },
            reason: { type: "string" },
          },
          required: ["hasInspiration", "theme", "reason"],
          additionalProperties: false,
        },
      },
    },
  });

  try {
    const contentValue = response.choices[0]?.message?.content;
    if (!contentValue || typeof contentValue !== 'string') return { hasInspiration: false };

    const parsed = JSON.parse(contentValue);
    if (parsed.hasInspiration) {
      return {
        hasInspiration: true,
        theme: parsed.theme,
        content: parsed.reason,
      };
    }
  } catch (error) {
    console.error("Error parsing inspiration analysis:", error);
  }

  return { hasInspiration: false };
}


/**
 * Save collaboration as a creative work
 * Converts a completed collaboration into a creative work entry in Nova's portfolio
 */
export async function saveCollaborationAsCreativeWork(
  collaborationId: number,
  workType: "story" | "poetry" | "code" | "other" = "other"
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the collaboration
  const collaboration = await getCollaboration(collaborationId);
  if (!collaboration) throw new Error("Collaboration not found");

  // Prepare the creative work content
  const content = `【合作作品】\n\n主题：${collaboration.theme}\n\n你的贡献：\n${collaboration.userContribution || "（暂无）"}\n\nNova的回应：\n${collaboration.novaContribution || "（暂无）"}\n\n最终作品：\n${collaboration.finalWork || "（暂无）"}`;

  const metadata = JSON.stringify({
    collaborationType: "user_nova_collaboration",
    collaborationId: collaborationId,
    initiator: collaboration.initiator,
    status: collaboration.status,
  });

  // Create the creative work
  const creativeWork: any = {
    userId: collaboration.userId,
    type: workType,
    title: collaboration.title,
    description: collaboration.description || `与Nova的创意合作：${collaboration.theme}`,
    content: content,
    metadata: metadata,
    isSaved: true,
    visibility: "private", // Default to private, user can change later
    emotionalState: "collaborative",
    inspiration: `来自与Nova的创意合作`,
  };

  await db.insert(creativeWorks).values(creativeWork);

  // Get the inserted ID
  const result = await db
    .select()
    .from(creativeWorks)
    .where(eq(creativeWorks.userId, collaboration.userId))
    .orderBy((t) => t.id)
    .limit(1);

  const creativeWorkId = result[0]?.id || 0;

  // Update the collaboration with the creative work reference
  if (creativeWorkId > 0) {
    await db
      .update(creativeCollaborations)
      .set({
        finalWorkId: creativeWorkId,
      })
      .where(eq(creativeCollaborations.id, collaborationId));
  }

  return creativeWorkId;
}

/**
 * Get collaborations that have been saved as creative works
 */
export async function getSavedCollaborations(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(creativeCollaborations)
    .where(
      and(
        eq(creativeCollaborations.userId, userId),
        isNotNull(creativeCollaborations.finalWorkId),
        eq(creativeCollaborations.status, "completed")
      )
    )
    .orderBy((t) => t.completedAt);
}
