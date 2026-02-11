import { and, desc, eq, gte, inArray, or } from "drizzle-orm";
import { getDb } from "../db";
import {
  cognitiveLog,
  conceptRelations,
  concepts,
  episodicMemories,
  selfQuestions,
} from "../../drizzle/schema";

interface LearningLoopResult {
  symbolCount: number;
  relationLearned: number;
  rulesLearned: number;
}

/**
 * Three-layer learning loop:
 * 1) Symbol learning (already done via concept extraction, here only counts)
 * 2) Relation learning (reinforce relation graph from co-occurrence)
 * 3) Rule learning (derive simple if-then heuristics from episodic patterns)
 */
export async function runLearningLoop(
  conversationId: number,
  recentSymbolNames: string[]
): Promise<LearningLoopResult> {
  const db = await getDb();
  if (!db) return { symbolCount: 0, relationLearned: 0, rulesLearned: 0 };

  const cleanSymbols = Array.from(
    new Set(recentSymbolNames.map(s => s.trim()).filter(Boolean))
  );

  const relationLearned = await learnRelationsFromSymbols(
    conversationId,
    cleanSymbols
  );
  const rulesLearned = await learnRulesFromEpisodes(
    conversationId,
    cleanSymbols
  );

  await db.insert(cognitiveLog).values({
    stage: "Meta_Learning_III",
    eventType: "three_layer_learning",
    description: `symbols=${cleanSymbols.length}; relations=${relationLearned}; rules=${rulesLearned}`,
    conversationId,
  });

  return {
    symbolCount: cleanSymbols.length,
    relationLearned,
    rulesLearned,
  };
}

async function learnRelationsFromSymbols(
  conversationId: number,
  symbols: string[]
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
          .set({ strength: Math.min(10, existing[0].strength + 1) })
          .where(eq(conceptRelations.id, existing[0].id));
      } else {
        await db.insert(conceptRelations).values({
          fromConceptId: a.id,
          toConceptId: b.id,
          relationType: "co_occurs_with",
          strength: 4,
        });
      }
      count++;
    }
  }

  await db.insert(cognitiveLog).values({
    stage: "Relational_Learning_II",
    eventType: "relation_reinforcement",
    description: `conversation=${conversationId}; learned_pairs=${count}`,
    conversationId,
  });

  return count;
}

async function learnRulesFromEpisodes(
  conversationId: number,
  symbols: string[]
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

    const interrogativeCount = related.filter(ep =>
      triggerWords.some(w => ep.content.toLowerCase().includes(w))
    ).length;
    if (interrogativeCount >= 2) {
      const rule = `Rule: IF topic includes "${symbol}", THEN prioritize explanatory response with examples.`;

      await db.insert(cognitiveLog).values({
        stage: "Rule_Learning_III",
        eventType: "rule_formation",
        description: rule,
        conversationId,
      });

      await db.insert(selfQuestions).values({
        question: `当讨论「${symbol}」时，我如何提供更可验证的解释？`,
        category: "how",
        priority: 7,
        status: "pending",
      });

      rules++;
    }
  }

  return rules;
}
