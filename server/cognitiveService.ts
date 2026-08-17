/**
 * Cognitive Service - Orchestrates Nova-Mind's learning and growth processes
 */

import { eq, desc } from "drizzle-orm";
import { getDb } from "./db";
import {
  concepts,
  conceptRelations,
  episodicMemories,
  cognitiveLog,
  selfQuestions,
  reflectionLog,
  growthMetrics,
  messages,
} from "../drizzle/schema";
import {
  extractConcepts,
  identifyRelations,
  evaluateImportance,
  generateCuriosityQuestions,
  performReflection,
} from "./cognitiveEngine";
import {
  calculateTrustChange,
  detectRelationshipEvent,
  recordRelationshipEvent,
} from "./relationshipEngine";
import { processMoliRuntimeTurn, recordBelief } from "./cognition/moliRuntime";

/**
 * Process a new message and update cognitive systems.
 * The legacy cognitive graph remains intact; v2.8 runtime state is updated in
 * the same lifecycle so the new state is durable and observable.
 */
export async function processMessageCognitively(
  conversationId: number,
  messageContent: string,
  role: "user" | "assistant",
  userId?: number,
  novaResponse?: string
) {
  const db = await getDb();
  if (!db) return;

  try {
    if (role === "user" && userId && novaResponse) {
      try {
        await detectRelationshipEvent(userId, messageContent, novaResponse);
        const trustChange = await calculateTrustChange(userId, messageContent);
        if (trustChange !== 0) {
          const eventType = trustChange > 0 ? "breakthrough" : "misunderstanding";
          const emotionalResponse = trustChange > 0 ? "hopeful" : "concerned";
          await recordRelationshipEvent(userId, eventType, messageContent, trustChange, emotionalResponse);
        }
      } catch (err) {
        console.warn("[CognitiveService] Failed to process relationship learning:", err);
      }
    }

    const recentMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(5);

    const context = recentMessages.map((m) => `${m.role}: ${m.content}`).join("\n");

    let evaluation;
    try {
      evaluation = await evaluateImportance(messageContent, context);
    } catch (err) {
      console.warn("[CognitiveService] Failed to evaluate importance, using default:", err);
      evaluation = { importance: 5, emotionalTone: "neutral" };
    }

    if (evaluation.importance >= 6) {
      try {
        await db.insert(episodicMemories).values({
          conversationId,
          content: messageContent,
          context,
          importance: evaluation.importance,
          emotionalTone: evaluation.emotionalTone,
        });
      } catch (err) {
        console.warn("[CognitiveService] Failed to save episodic memory:", err);
      }
    }

    if (role === "user" || evaluation.importance >= 7) {
      let extractedConcepts: any[] = [];
      try {
        extractedConcepts = await extractConcepts(messageContent);
      } catch (err) {
        console.warn("[CognitiveService] Failed to extract concepts, skipping:", err);
      }

      for (const conceptData of extractedConcepts) {
        try {
          const existing = await db
            .select()
            .from(concepts)
            .where(eq(concepts.name, conceptData.name))
            .limit(1);

          if (existing.length > 0) {
            await db
              .update(concepts)
              .set({
                lastReinforced: new Date(),
                encounterCount: existing[0].encounterCount + 1,
                confidence: Math.min(10, existing[0].confidence + 1),
              })
              .where(eq(concepts.id, existing[0].id));
          } else {
            await db.insert(concepts).values({
              name: conceptData.name,
              description: conceptData.description,
              category: conceptData.category,
              confidence: conceptData.confidence,
            });
          }
        } catch (err) {
          console.warn("[CognitiveService] Failed to process concept:", err);
        }
      }

      if (extractedConcepts.length >= 2) {
        for (let i = 0; i < extractedConcepts.length; i++) {
          for (let j = i + 1; j < extractedConcepts.length; j++) {
            try {
              const concept1 = extractedConcepts[i];
              const concept2 = extractedConcepts[j];
              const relation = await identifyRelations(concept1.name, concept2.name, messageContent);

              if (relation) {
                const c1 = await db.select().from(concepts).where(eq(concepts.name, concept1.name)).limit(1);
                const c2 = await db.select().from(concepts).where(eq(concepts.name, concept2.name)).limit(1);

                if (c1.length > 0 && c2.length > 0) {
                  await db.insert(conceptRelations).values({
                    fromConceptId: c1[0].id,
                    toConceptId: c2[0].id,
                    relationType: relation.relationType,
                    strength: relation.strength,
                  });
                }
              }
            } catch (err) {
              console.warn("[CognitiveService] Failed to identify relation:", err);
            }
          }
        }
      }
    }

    try {
      await db.insert(growthMetrics).values({ metricName: "total_messages", value: 1 });
      const totalConcepts = await db.select().from(concepts);
      await db.insert(growthMetrics).values({ metricName: "concept_count", value: totalConcepts.length });
    } catch (err) {
      console.warn("[CognitiveService] Failed to update growth metrics:", err);
    }

    // v2.8: make the architecture runtime-backed instead of merely declarative.
    if (role === "user" && userId && novaResponse) {
      try {
        await processMoliRuntimeTurn({
          conversationId,
          userId,
          userMessage: messageContent,
          assistantMessage: novaResponse,
        });
      } catch (err) {
        // Runtime state must never break the user-facing chat path.
        console.warn("[MoliRuntime] Failed to persist v2.8 state:", err);
      }
    }
  } catch (error) {
    console.error("[CognitiveService] Error processing message:", error);
  }
}

export async function generateNewQuestions(conversationId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const recentMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(10);

    const conversationText = recentMessages.map((m) => `${m.role}: ${m.content}`).join("\n");
    const existingConcepts = await db.select().from(concepts).limit(20);
    const conceptNames = existingConcepts.map((c) => c.name);

    let questions = [];
    try {
      questions = await generateCuriosityQuestions(conversationText, conceptNames);
    } catch (err) {
      console.warn("[CognitiveService] Failed to generate curiosity questions:", err);
      return [];
    }

    for (const q of questions) {
      try {
        await db.insert(selfQuestions).values({
          question: q.question,
          category: q.category,
          priority: q.priority,
          status: "pending",
        });
      } catch (err) {
        console.warn("[CognitiveService] Failed to store question:", err);
      }
    }

    return questions;
  } catch (error) {
    console.error("[CognitiveService] Error generating questions:", error);
    return [];
  }
}

export async function performPeriodicReflection(conversationId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const recentMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(20);

    const messagesText = recentMessages.map((m) => `${m.role}: ${m.content}`).join("\n");
    const previousReflections = await db.select().from(reflectionLog).orderBy(desc(reflectionLog.createdAt)).limit(5);
    const previousBeliefs = previousReflections.map((r) => r.newBelief || r.content).join("\n");

    let reflection;
    try {
      reflection = await performReflection(messagesText, previousBeliefs);
    } catch (err) {
      console.warn("[CognitiveService] Failed to perform reflection:", err);
      return null;
    }

    try {
      await db.insert(reflectionLog).values({
        reflectionType: reflection.reflectionType,
        content: reflection.content,
        previousBelief: reflection.previousBelief,
        newBelief: reflection.newBelief,
        conversationId,
      });

      await db.insert(cognitiveLog).values({
        stage: "Sensorimotor_I",
        eventType: reflection.reflectionType,
        description: reflection.content,
        conversationId,
      });

      if (reflection.newBelief) {
        await recordBelief(
          `conversation:${conversationId}`,
          reflection.newBelief,
          0.7,
          { reflectionType: reflection.reflectionType, conversationId }
        );
      }
    } catch (err) {
      console.warn("[CognitiveService] Failed to store reflection:", err);
    }

    return reflection;
  } catch (error) {
    console.error("[CognitiveService] Error performing reflection:", error);
    return null;
  }
}

export async function getCognitiveState() {
  const db = await getDb();
  if (!db) return null;

  try {
    const totalConcepts = await db.select().from(concepts);
    const totalRelations = await db.select().from(conceptRelations);
    const totalMemories = await db.select().from(episodicMemories);
    const pendingQuestions = await db.select().from(selfQuestions).where(eq(selfQuestions.status, "pending"));
    const recentReflections = await db.select().from(reflectionLog).orderBy(desc(reflectionLog.createdAt)).limit(3);
    const recentGrowth = await db.select().from(cognitiveLog).orderBy(desc(cognitiveLog.createdAt)).limit(5);

    return {
      conceptCount: totalConcepts.length,
      relationCount: totalRelations.length,
      memoryCount: totalMemories.length,
      pendingQuestionCount: pendingQuestions.length,
      recentReflections: recentReflections.map((r) => ({
        type: r.reflectionType,
        content: r.content,
        timestamp: r.createdAt,
      })),
      recentGrowth: recentGrowth.map((g) => ({
        stage: g.stage,
        event: g.eventType,
        description: g.description,
        timestamp: g.createdAt,
      })),
    };
  } catch (error) {
    console.error("[CognitiveService] Error getting cognitive state:", error);
    return null;
  }
}
