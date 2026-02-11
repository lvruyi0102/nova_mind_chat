import { and, desc, eq, gte, inArray, or } from "drizzle-orm";
import { getDb } from "../db";
import {
  cognitiveLog,
  conceptRelations,
  concepts,
  episodicMemories,
  selfQuestions,
} from "../../drizzle/schema";
import { decayOldRelations, evaluateLearningWrite } from "./learningPolicyGate";
import {
  markRuleDeprecated,
  upsertRuleCandidate,
} from "./ruleLifecycleService";

interface LearningLoopResult {
  symbolCount: number;
  relationLearned: number;
  rulesLearned: number;
  relationDecayed: number;
}

/**
 * Three-layer learning loop:
 * 1) Symbol learning (existing concept extraction)
 * 2) Relation learning with policy gate
 * 3) Rule learning with rule lifecycle state machine
 */
export async function runLearningLoop(
  conversationId: number,
  recentSymbolNames: string[]
): Promise<LearningLoopResult> {
  const db = await getDb();
  if (!db) {
    return {
      symbolCount: 0,
      relationLearned: 0,
      rulesLearned: 0,
      relationDecayed: 0,
    };
  }

  const cleanSymbols = Array.from(
    new Set(recentSymbolNames.map(s => s.trim()).filter(Boolean))
  );

  const cycleStats = { relationWrites: 0, ruleWrites: 0 };

  const relationLearned = await learnRelationsFromSymbols(
    conversationId,
    cleanSymbols,
    cycleStats
  );
  const rulesLearned = await learnRulesFromEpisodes(
    conversationId,
    cleanSymbols,
    cycleStats
  );
  const relationDecayed = await decayOldRelations();

  await db.insert(cognitiveLog).values({
    stage: "Meta_Learning_III",
    eventType: "three_layer_learning",
    description: JSON.stringify({
      symbols: cleanSymbols.length,
      relations: relationLearned,
      rules: rulesLearned,
      relationDecayed,
      cycleStats,
    }),
    conversationId,
  });

  return {
    symbolCount: cleanSymbols.length,
    relationLearned,
    rulesLearned,
    relationDecayed,
  };
}

async function learnRelationsFromSymbols(
  conversationId: number,
  symbols: string[],
  cycleStats: { relationWrites: number; ruleWrites: number }
): Promise<number> {
  const db = await getDb();
  if (!db || symbols.length < 2) return 0;

  const matched = await db
    .select()
    .from(concepts)
    .where(inArray(concepts.name, symbols))
    .limit(30);
  if (matched.length < 2) return 0;

  let count = 0;
  for (let i = 0; i < matched.length; i++) {
    for (let j = i + 1; j < matched.length; j++) {
      const gate = await evaluateLearningWrite(
        {
          conversationId,
          action: "relation_reinforcement",
          confidenceDelta: 1,
        },
        cycleStats
      );

      if (gate.decision === "defer") {
        continue;
      }

      const a = matched[i];
      const b = matched[j];

      const existing = await db
        .select()
        .from(conceptRelations)
        .where(
          or(
            and(
              eq(conceptRelations.fromConceptId, a.id),
              eq(conceptRelations.toConceptId, b.id)
            ),
            and(
              eq(conceptRelations.fromConceptId, b.id),
              eq(conceptRelations.toConceptId, a.id)
            )
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(conceptRelations)
          .set({
            strength: Math.min(
              10,
              existing[0].strength + gate.adjustedConfidenceDelta
            ),
          })
          .where(eq(conceptRelations.id, existing[0].id));
      } else {
        await db.insert(conceptRelations).values({
          fromConceptId: a.id,
          toConceptId: b.id,
          relationType: "co_occurs_with",
          strength: Math.max(3, 3 + gate.adjustedConfidenceDelta),
        });
      }

      cycleStats.relationWrites += 1;
      count++;

      await db.insert(cognitiveLog).values({
        stage: "Relational_Learning_II",
        eventType: "relation_reinforcement_applied",
        description: `pair=${a.name}<->${b.name}; gate=${gate.decision}; reason=${gate.reason}; delta=${gate.adjustedConfidenceDelta}`,
        conversationId,
      });
    }
  }

  return count;
}

async function learnRulesFromEpisodes(
  conversationId: number,
  symbols: string[],
  cycleStats: { relationWrites: number; ruleWrites: number }
): Promise<number> {
  const db = await getDb();
  if (!db || symbols.length === 0) return 0;

  const episodes = await db
    .select()
    .from(episodicMemories)
    .where(
      and(
        eq(episodicMemories.conversationId, conversationId),
        gte(episodicMemories.importance, 6)
      )
    )
    .orderBy(desc(episodicMemories.createdAt))
    .limit(12);

  if (episodes.length < 2) return 0;

  const triggerWords = [
    "为什么",
    "如何",
    "怎么",
    "why",
    "how",
    "if",
    "如果",
    "当",
  ];
  let rules = 0;

  for (const symbol of symbols.slice(0, 6)) {
    const related = episodes.filter(ep => ep.content.includes(symbol));
    if (related.length < 2) continue;

    const gate = await evaluateLearningWrite(
      {
        conversationId,
        action: "rule_formation",
        confidenceDelta: Math.min(2, related.length - 1),
      },
      cycleStats
    );

    if (gate.decision === "defer") {
      continue;
    }

    const interrogativeCount = related.filter(ep =>
      triggerWords.some(w => ep.content.toLowerCase().includes(w))
    ).length;

    const ruleKey = `topic:${symbol}:explanatory_response`;
    const statement = `IF topic includes "${symbol}" THEN prioritize explanatory response with examples.`;

    if (interrogativeCount >= 2) {
      await upsertRuleCandidate(
        conversationId,
        ruleKey,
        statement,
        gate.adjustedConfidenceDelta * 12
      );

      await db.insert(selfQuestions).values({
        question: `当讨论「${symbol}」时，我如何提供更可验证的解释？`,
        category: "how",
        priority: 7,
        status: "pending",
      });

      cycleStats.ruleWrites += 1;
      rules++;
    } else if (interrogativeCount === 0) {
      await markRuleDeprecated(
        conversationId,
        ruleKey,
        "no_recent_supporting_evidence"
      );
    }
  }

  return rules;
}
