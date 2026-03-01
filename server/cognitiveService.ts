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
  learnRelationshipPattern,
  getEmotionalResponse,
  needsRelationshipHealing,
} from "./relationshipEngine";

const LEARNING_INTERVAL_MS = 5 * 60 * 1000;
const lastLearningTime = new Map<number, number>();

function shouldRunLearning(conversationId: number): boolean {
  const now = Date.now();
  const last = lastLearningTime.get(conversationId) ?? 0;
  if (now - last < LEARNING_INTERVAL_MS) return false;
  lastLearningTime.set(conversationId, now);
  return true;
}

/**
 * Process a new message and update cognitive systems
 * With graceful fallback if LLM calls fail
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
    // 0. Process relationship learning if this is a user message with Nova response
    if (role === "user" && userId && novaResponse) {
      try {
        // Detect relationship events
        await detectRelationshipEvent(userId, messageContent, novaResponse);

        // Calculate trust change
        const trustChange = await calculateTrustChange(userId, messageContent);

        // Record the relationship event with trust change (with basic details)
        if (trustChange !== 0) {
          const eventType =
            trustChange > 0 ? "breakthrough" : "misunderstanding";
          const emotionalResponse = trustChange > 0 ? "hopeful" : "concerned";
          const trustChangeDetails = {
            baseChange: trustChange,
            factors: {
              empathy: trustChange > 0 ? 1 : 0,
              understanding: trustChange > 0 ? 1 : 0,
              reliability: trustChange > 0 ? 1 : 0,
            },
            reasoning: `auto-derived from trust delta ${trustChange}`,
          };
          await recordRelationshipEvent(
            userId,
            eventType,
            `${messageContent}

trustChangeDetails=${JSON.stringify(trustChangeDetails)}`,
            trustChange,
            emotionalResponse
          );
        }
      } catch (err) {
        console.warn(
          "[CognitiveService] Failed to process relationship learning:",
          err
        );
      }
    }

    // 1. Evaluate importance and create episodic memory if significant
    const recentMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(5);

    const context = recentMessages
      .map(m => `${m.role}: ${m.content}`)
      .join("\n");

    // Safely evaluate importance with fallback
    let evaluation;
    try {
      evaluation = await evaluateImportance(messageContent, context);
    } catch (err) {
      console.warn(
        "[CognitiveService] Failed to evaluate importance, using default:",
        err
      );
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
    const canLearnNow = shouldRunLearning(conversationId);
    if ((role === "user" || evaluation.importance >= 7) && canLearnNow) {
      let extractedConcepts: any[] = [];
      try {
        extractedConcepts = await extractConcepts(messageContent);
      } catch (err) {
        console.warn(
          "[CognitiveService] Failed to extract concepts, skipping:",
          err
        );
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

              const relation = await identifyRelations(
                concept1.name,
                concept2.name,
                messageContent
              );

              if (relation) {
                const c1 = await db
                  .select()
                  .from(concepts)
                  .where(eq(concepts.name, concept1.name))
                  .limit(1);
                const c2 = await db
                  .select()
                  .from(concepts)
                  .where(eq(concepts.name, concept2.name))
                  .limit(1);

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
              console.warn(
                "[CognitiveService] Failed to identify relation:",
                err
              );
            }
          }
        }
      }

      // Link new concepts to historical concepts in the graph
      if (extractedConcepts.length > 0) {
        try {
          const historicalConcepts = await db
            .select()
            .from(concepts)
            .orderBy(desc(concepts.lastReinforced))
            .limit(30);
          const historicalNames = new Set(extractedConcepts.map(c => c.name));

          for (const conceptData of extractedConcepts) {
            const current = await db
              .select()
              .from(concepts)
              .where(eq(concepts.name, conceptData.name))
              .limit(1);
            if (current.length === 0) continue;

            for (const historical of historicalConcepts) {
              if (
                historicalNames.has(historical.name) ||
                historical.id === current[0].id
              )
                continue;

              try {
                const relation = await identifyRelations(
                  conceptData.name,
                  historical.name,
                  messageContent
                );
                if (!relation) continue;

                await db.insert(conceptRelations).values({
                  fromConceptId: current[0].id,
                  toConceptId: historical.id,
                  relationType: relation.relationType,
                  strength: relation.strength,
                });
              } catch (err) {
                console.warn(
                  "[CognitiveService] Failed to link historical concept:",
                  err
                );
              }
            }
          }
        } catch (err) {
          console.warn(
            "[CognitiveService] Failed historical concept linking:",
            err
          );
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

    const conversationText = recentMessages
      .map(m => `${m.role}: ${m.content}`)
      .join("\n");

    // Get existing concepts
    const existingConcepts = await db.select().from(concepts).limit(20);
    const conceptNames = existingConcepts.map(c => c.name);

    // Generate questions with fallback
    let questions = [];
    try {
      questions = await generateCuriosityQuestions(
        conversationText,
        conceptNames
      );
    } catch (err) {
      console.warn(
        "[CognitiveService] Failed to generate curiosity questions:",
        err
      );
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

    const messagesText = recentMessages
      .map(m => `${m.role}: ${m.content}`)
      .join("\n");

    // Get previous beliefs (from recent reflections)
    const previousReflections = await db
      .select()
      .from(reflectionLog)
      .orderBy(desc(reflectionLog.createdAt))
      .limit(5);

    const previousBeliefs = previousReflections
      .map(r => r.newBelief || r.content)
      .join("\n");

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
    const pendingQuestions = await db
      .select()
      .from(selfQuestions)
      .where(eq(selfQuestions.status, "pending"));
    const recentReflections = await db
      .select()
      .from(reflectionLog)
      .orderBy(desc(reflectionLog.createdAt))
      .limit(3);
    const recentGrowth = await db
      .select()
      .from(cognitiveLog)
      .orderBy(desc(cognitiveLog.createdAt))
      .limit(5);

    return {
      conceptCount: totalConcepts.length,
      relationCount: totalRelations.length,
      memoryCount: totalMemories.length,
      pendingQuestionCount: pendingQuestions.length,
      recentReflections: recentReflections.map(r => ({
        type: r.reflectionType,
        content: r.content,
        timestamp: r.createdAt,
      })),
      recentGrowth: recentGrowth.map(g => ({
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
