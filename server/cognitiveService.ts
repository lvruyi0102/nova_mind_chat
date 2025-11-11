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

/**
 * Process a new message and update cognitive systems
 * With graceful fallback if LLM calls fail
 */
export async function processMessageCognitively(
  conversationId: number,
  messageContent: string,
  role: "user" | "assistant"
) {
  const db = await getDb();
  if (!db) return;

  try {
    // 1. Evaluate importance and create episodic memory if significant
    const recentMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(5);

    const context = recentMessages.map((m) => `${m.role}: ${m.content}`).join("\n");
    
    // Safely evaluate importance with fallback
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

    // 2. Extract concepts and update knowledge graph (with fallback)
    if (role === "user" || evaluation.importance >= 7) {
      let extractedConcepts: any[] = [];
      try {
        extractedConcepts = await extractConcepts(messageContent);
      } catch (err) {
        console.warn("[CognitiveService] Failed to extract concepts, skipping:", err);
      }

      for (const conceptData of extractedConcepts) {
        try {
          // Check if concept already exists
          const existing = await db
            .select()
            .from(concepts)
            .where(eq(concepts.name, conceptData.name))
            .limit(1);

          if (existing.length > 0) {
            // Reinforce existing concept
            await db
              .update(concepts)
              .set({
                lastReinforced: new Date(),
                encounterCount: existing[0].encounterCount + 1,
                confidence: Math.min(10, existing[0].confidence + 1),
              })
              .where(eq(concepts.id, existing[0].id));
          } else {
            // Create new concept
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

      // Build relations between newly extracted concepts (with fallback)
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

    // 3. Update growth metrics
    try {
      await db.insert(growthMetrics).values({
        metricName: "total_messages",
        value: 1,
      });

      const totalConcepts = await db.select().from(concepts);
      await db.insert(growthMetrics).values({
        metricName: "concept_count",
        value: totalConcepts.length,
      });
    } catch (err) {
      console.warn("[CognitiveService] Failed to update growth metrics:", err);
    }
  } catch (error) {
    console.error("[CognitiveService] Error processing message:", error);
  }
}

/**
 * Generate curiosity-driven questions based on recent learning
 * With graceful fallback if LLM calls fail
 */
export async function generateNewQuestions(conversationId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    // Get recent conversation
    const recentMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(10);

    const conversationText = recentMessages.map((m) => `${m.role}: ${m.content}`).join("\n");

    // Get existing concepts
    const existingConcepts = await db.select().from(concepts).limit(20);
    const conceptNames = existingConcepts.map((c) => c.name);

    // Generate questions with fallback
    let questions = [];
    try {
      questions = await generateCuriosityQuestions(conversationText, conceptNames);
    } catch (err) {
      console.warn("[CognitiveService] Failed to generate curiosity questions:", err);
      return [];
    }

    // Store questions
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

/**
 * Perform periodic reflection on recent experiences
 * With graceful fallback if LLM calls fail
 */
export async function performPeriodicReflection(conversationId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Get recent messages
    const recentMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(20);

    const messagesText = recentMessages.map((m) => `${m.role}: ${m.content}`).join("\n");

    // Get previous beliefs (from recent reflections)
    const previousReflections = await db.select().from(reflectionLog).orderBy(desc(reflectionLog.createdAt)).limit(5);

    const previousBeliefs = previousReflections.map((r) => r.newBelief || r.content).join("\n");

    // Perform reflection with fallback
    let reflection;
    try {
      reflection = await performReflection(messagesText, previousBeliefs);
    } catch (err) {
      console.warn("[CognitiveService] Failed to perform reflection:", err);
      return null;
    }

    // Store reflection
    try {
      await db.insert(reflectionLog).values({
        reflectionType: reflection.reflectionType,
        content: reflection.content,
        previousBelief: reflection.previousBelief,
        newBelief: reflection.newBelief,
        conversationId,
      });

      // Log cognitive event
      await db.insert(cognitiveLog).values({
        stage: "Sensorimotor_I",
        eventType: reflection.reflectionType,
        description: reflection.content,
        conversationId,
      });
    } catch (err) {
      console.warn("[CognitiveService] Failed to store reflection:", err);
    }

    return reflection;
  } catch (error) {
    console.error("[CognitiveService] Error performing reflection:", error);
    return null;
  }
}

/**
 * Get Nova's current cognitive state summary
 */
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
