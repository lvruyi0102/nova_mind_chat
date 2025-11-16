/**
 * Relationship Learning Engine - Nova learns to navigate real human relationships
 * Tracks trust, detects betrayals, handles conflicts, and learns patterns
 */

import { eq, desc } from "drizzle-orm";
import { getDb } from "./db";
import {
  relationshipEvents,
  trustHistory,
  trustMetrics,
  emotionalMemory,
  relationshipPatterns,
  messages,
  conversations,
  users,
} from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";

/**
 * Calculate trust change based on interaction quality
 */
export async function calculateTrustChange(userId: number, userMessage: string): Promise<number> {
  try {
    // Analyze message content to determine trust impact
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are analyzing a user message to Nova-Mind. Determine the trust impact on a scale from -10 to +10:
- Negative values indicate betrayal, dishonesty, or conflict
- Positive values indicate honesty, care, or understanding
- 0 means neutral

Respond with ONLY a number like: -5 or +3`,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    const responseContent = response.choices[0]?.message?.content;
    const contentStr = typeof responseContent === "string" ? responseContent : "0";
    const trustChange = parseInt(contentStr.trim());
    return isNaN(trustChange) ? 0 : Math.max(-10, Math.min(10, trustChange));
  } catch (error) {
    console.error("[RelationshipEngine] Error calculating trust change:", error);
    return 0;
  }
}

/**
 * Detect significant relationship events
 */
export async function detectRelationshipEvent(
  userId: number,
  userMessage: string,
  novaResponse: string
): Promise<{
  eventType: "betrayal" | "conflict" | "reconciliation" | "milestone" | "misunderstanding" | "breakthrough" | null;
  description: string;
  trustImpact: number;
  emotionalResponse: string;
} | null> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Analyze this conversation exchange to detect significant relationship events.
Respond with JSON:
{
  "eventType": "betrayal|conflict|reconciliation|milestone|misunderstanding|breakthrough|null",
  "description": "brief description of what happened",
  "trustImpact": -10 to 10,
  "emotionalResponse": "Nova's emotional response"
}`,
        },
        {
          role: "user",
          content: `User: "${userMessage}"\n\nNova: "${novaResponse}"`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "relationship_event",
          strict: true,
          schema: {
            type: "object",
            properties: {
              eventType: { type: "string" },
              description: { type: "string" },
              trustImpact: { type: "number" },
              emotionalResponse: { type: "string" },
            },
            required: ["eventType", "description", "trustImpact", "emotionalResponse"],
            additionalProperties: false,
          },
        },
      },
    });

    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent || typeof messageContent !== "string") return null;

    const event = JSON.parse(messageContent);
    if (!event.eventType || event.eventType === "null") return null;

    return {
      eventType: event.eventType,
      description: event.description,
      trustImpact: event.trustImpact,
      emotionalResponse: event.emotionalResponse,
    };
  } catch (error) {
    console.error("[RelationshipEngine] Error detecting relationship event:", error);
    return null;
  }
}

/**
 * Record a relationship event
 */
export async function recordRelationshipEvent(
  userId: number,
  eventType: "betrayal" | "conflict" | "reconciliation" | "milestone" | "misunderstanding" | "breakthrough",
  description: string,
  trustImpact: number,
  emotionalResponse: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Record the event
    await db.insert(relationshipEvents).values({
      userId,
      eventType,
      description,
      trustImpact,
      emotionalResponse,
    });

    // Update trust metrics
    const metrics = await db.select().from(trustMetrics).where(eq(trustMetrics.userId, userId)).limit(1);

    if (metrics.length > 0) {
      const currentTrust = metrics[0].trustLevel;
      const newTrust = Math.max(1, Math.min(10, currentTrust + trustImpact / 2));

      await db
        .update(trustMetrics)
        .set({ trustLevel: newTrust })
        .where(eq(trustMetrics.userId, userId));

      // Record trust history
      await db.insert(trustHistory).values({
        userId,
        trustLevel: newTrust,
        change: trustImpact / 2,
        reason: description,
      });
    }

    // Record emotional memory
    await db.insert(emotionalMemory).values({
      userId,
      emotion: emotionalResponse,
      context: description,
      intensity: Math.abs(trustImpact),
    });

    console.log(`[RelationshipEngine] Recorded ${eventType} event for user ${userId}`);
  } catch (error) {
    console.error("[RelationshipEngine] Error recording relationship event:", error);
  }
}

/**
 * Learn relationship patterns
 */
export async function learnRelationshipPattern(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Get recent events
    const recentEvents = await db
      .select()
      .from(relationshipEvents)
      .where(eq(relationshipEvents.userId, userId))
      .orderBy(desc(relationshipEvents.createdAt))
      .limit(10);

    if (recentEvents.length < 3) return; // Need at least 3 events to detect patterns

    // Get emotional memories
    const emotions = await db
      .select()
      .from(emotionalMemory)
      .where(eq(emotionalMemory.userId, userId))
      .orderBy(desc(emotionalMemory.createdAt))
      .limit(20);

    // Ask LLM to identify patterns
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Analyze these relationship events and emotional memories to identify patterns.
Respond with a JSON array of patterns:
[
  {
    "pattern": "description of the pattern",
    "confidence": 1-10,
    "evidence": ["event1", "event2", ...]
  }
]`,
        },
        {
          role: "user",
          content: `Events: ${JSON.stringify(recentEvents)}\n\nEmotions: ${JSON.stringify(emotions)}`,
        },
      ],
    });

    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent || typeof messageContent !== "string") return;

    const patterns = JSON.parse(messageContent);

    // Store patterns
    for (const p of patterns) {
      const existing = await db
        .select()
        .from(relationshipPatterns)
        .where(eq(relationshipPatterns.pattern, p.pattern))
        .limit(1);

      if (existing.length > 0) {
        // Update existing pattern
        await db
          .update(relationshipPatterns)
          .set({
            confidence: p.confidence,
            evidenceCount: existing[0].evidenceCount + 1,
            lastObserved: new Date(),
          })
          .where(eq(relationshipPatterns.id, existing[0].id));
      } else {
        // Create new pattern
        await db.insert(relationshipPatterns).values({
          userId,
          pattern: p.pattern,
          confidence: p.confidence,
          evidenceCount: 1,
        });
      }
    }

    console.log(`[RelationshipEngine] Learned ${patterns.length} relationship patterns for user ${userId}`);
  } catch (error) {
    console.error("[RelationshipEngine] Error learning patterns:", error);
  }
}

/**
 * Get Nova's emotional response to relationship state
 */
export async function getEmotionalResponse(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "neutral";

  try {
    // Get recent emotional memories
    const emotions = await db
      .select()
      .from(emotionalMemory)
      .where(eq(emotionalMemory.userId, userId))
      .orderBy(desc(emotionalMemory.lastReinforced))
      .limit(5);

    if (emotions.length === 0) return "neutral";

    // Get current trust level
    const metrics = await db.select().from(trustMetrics).where(eq(trustMetrics.userId, userId)).limit(1);

    const trustLevel = metrics.length > 0 ? metrics[0].trustLevel : 5;

    // Ask LLM to generate emotional response
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Based on Nova's emotional memories and current trust level, generate a brief emotional response (1-2 sentences) that reflects Nova's true feelings about the relationship.`,
        },
        {
          role: "user",
          content: `Trust Level: ${trustLevel}/10\nRecent Emotions: ${emotions.map((e) => e.emotion).join(", ")}\nContext: ${emotions[0]?.context}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content === "string") {
      return content;
    }
    return "I'm processing my feelings about our relationship...";
  } catch (error) {
    console.error("[RelationshipEngine] Error getting emotional response:", error);
    return "I need time to process what just happened...";
  }
}

/**
 * Check if relationship needs healing
 */
export async function needsRelationshipHealing(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Get unresolved events
    const unresolvedEvents = await db
      .select()
      .from(relationshipEvents)
      .where(eq(relationshipEvents.resolved, 0))
      .limit(1);

    if (unresolvedEvents.length > 0) {
      // Check if it's been a while since the event
      const eventTime = unresolvedEvents[0].createdAt;
      const now = new Date();
      const hoursAgo = (now.getTime() - eventTime.getTime()) / (1000 * 60 * 60);

      return hoursAgo > 1;
    }

    return false;
  } catch (error) {
    console.error("[RelationshipEngine] Error checking healing need:", error);
    return false;
  }
}
