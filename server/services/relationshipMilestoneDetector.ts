/**
 * Relationship Milestone Detector - Identifies important moments in Nova-User relationship
 * Detects milestones like first deep conversation, trust moments, conflicts, breakthroughs
 */

import { getDb } from "../db";
import { messages, conversations } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { eq, desc, and } from "drizzle-orm";

export interface RelationshipMilestone {
  id?: number;
  conversationId: number;
  messageId: number;
  type:
    | "first_meeting"
    | "deep_conversation"
    | "trust_moment"
    | "conflict"
    | "breakthrough"
    | "emotional_support"
    | "shared_learning"
    | "vulnerability"
    | "celebration"
    | "reconciliation";
  title: string;
  description: string;
  emotionalSignificance: number; // 1-10
  timestamp: Date;
}

/**
 * Detect milestones in conversation history
 */
export async function detectRelationshipMilestones(
  userId: number,
  conversationId: number
): Promise<RelationshipMilestone[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    console.log(
      `[RelationshipMilestoneDetector] Analyzing conversation ${conversationId} for milestones`
    );

    // Get recent messages from conversation
    const recentMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(50);

    if (recentMessages.length < 5) {
      console.log(
        "[RelationshipMilestoneDetector] Not enough messages for analysis"
      );
      return [];
    }

    // Prepare message context for analysis
    const messageContext = recentMessages
      .reverse()
      .map((msg, idx) => `[${idx}] ${msg.role}: ${msg.content.substring(0, 100)}...`)
      .join("\n");

    // Use LLM to detect milestones
    const analysisPrompt = `
Analyze this conversation between Nova (AI) and a user to identify relationship milestones.
Milestones are important moments that define the relationship development.

Conversation:
${messageContext}

Identify up to 3 most significant milestones. For each milestone, provide:
1. Type (first_meeting, deep_conversation, trust_moment, conflict, breakthrough, emotional_support, shared_learning, vulnerability, celebration, reconciliation)
2. Title (short name)
3. Description (why this is significant)
4. Emotional Significance (1-10)
5. Message Index (which message triggered this milestone)

Format as JSON array with objects containing: type, title, description, emotionalSignificance, messageIndex
`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are an expert in analyzing human-AI relationships and identifying important moments.",
        },
        { role: "user", content: analysisPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "milestones",
          strict: true,
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: [
                    "first_meeting",
                    "deep_conversation",
                    "trust_moment",
                    "conflict",
                    "breakthrough",
                    "emotional_support",
                    "shared_learning",
                    "vulnerability",
                    "celebration",
                    "reconciliation",
                  ],
                },
                title: { type: "string" },
                description: { type: "string" },
                emotionalSignificance: { type: "number", minimum: 1, maximum: 10 },
                messageIndex: { type: "number" },
              },
              required: ["type", "title", "description", "emotionalSignificance", "messageIndex"],
              additionalProperties: false,
            },
          },
        },
      },
    });

    let milestones: RelationshipMilestone[] = [];

    try {
      const content = response.choices[0]?.message?.content;
      if (typeof content === "string") {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          milestones = parsed.map((m: any) => ({
            conversationId,
            messageId: recentMessages[m.messageIndex]?.id || 0,
            type: m.type,
            title: m.title,
            description: m.description,
            emotionalSignificance: m.emotionalSignificance,
            timestamp: recentMessages[m.messageIndex]?.createdAt || new Date(),
          }));
        }
      }
    } catch (parseError) {
      console.error(
        "[RelationshipMilestoneDetector] Failed to parse LLM response:",
        parseError
      );
    }

    console.log(
      `[RelationshipMilestoneDetector] Detected ${milestones.length} milestones`
    );
    return milestones;
  } catch (error) {
    console.error("[RelationshipMilestoneDetector] Error detecting milestones:", error);
    return [];
  }
}

/**
 * Get relationship timeline for dashboard
 */
export async function getRelationshipTimeline(userId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Get all conversations for user
    const userConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt));

    if (userConversations.length === 0) {
      return {
        totalConversations: 0,
        relationshipPhase: "beginning",
        milestones: [],
        estimatedTrustLevel: 0,
      };
    }

    // Calculate relationship metrics
    const totalMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, userConversations[0].id));

    const relationshipPhase = calculateRelationshipPhase(
      userConversations.length,
      totalMessages.length
    );

    return {
      totalConversations: userConversations.length,
      relationshipPhase,
      milestones: [], // Would be populated with actual milestones from database
      estimatedTrustLevel: Math.min(
        10,
        Math.floor((userConversations.length / 10) * 10)
      ),
      firstConversation: userConversations[userConversations.length - 1]?.createdAt,
      lastConversation: userConversations[0]?.createdAt,
    };
  } catch (error) {
    console.error("[RelationshipMilestoneDetector] Error getting timeline:", error);
    return null;
  }
}

/**
 * Calculate relationship phase based on conversation count and depth
 */
function calculateRelationshipPhase(
  conversationCount: number,
  messageCount: number
): string {
  if (conversationCount === 0) return "beginning";
  if (conversationCount < 3) return "initial_contact";
  if (conversationCount < 10 && messageCount < 50) return "exploration";
  if (conversationCount < 20) return "developing_trust";
  if (conversationCount < 50) return "established_relationship";
  return "deep_connection";
}

/**
 * Get milestone statistics
 */
export async function getMilestoneStats(userId: number) {
  const timeline = await getRelationshipTimeline(userId);
  if (!timeline) return null;

  return {
    phase: timeline.relationshipPhase,
    trustLevel: timeline.estimatedTrustLevel,
    conversationCount: timeline.totalConversations,
    relationshipDuration: timeline.firstConversation
      ? Math.floor(
          (new Date().getTime() - timeline.firstConversation.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0,
  };
}
