import { and, desc, eq, inArray, like, or } from "drizzle-orm";
import { getDb } from "../db";
import {
  conceptRelations,
  concepts,
  episodicMemories,
} from "../../drizzle/schema";

export interface MemorySnippet {
  type: "episodic" | "concept" | "relation";
  content: string;
  score: number;
}

/**
 * Query episodic memory by conversation context keywords.
 */
export async function queryByContext(
  conversationId: number,
  contextText: string
): Promise<MemorySnippet[]> {
  const db = await getDb();
  if (!db) return [];

  const keywords = extractKeywords(contextText);
  if (keywords.length === 0) return [];

  const keywordPredicates = keywords.map(kw =>
    like(episodicMemories.content, `%${kw}%`)
  );

  const rows = await db
    .select()
    .from(episodicMemories)
    .where(
      and(
        eq(episodicMemories.conversationId, conversationId),
        or(...keywordPredicates)
      )
    )
    .orderBy(
      desc(episodicMemories.importance),
      desc(episodicMemories.createdAt)
    )
    .limit(5);

  return rows.map(row => ({
    type: "episodic" as const,
    content: `${row.content}${row.emotionalTone ? ` (情绪: ${row.emotionalTone})` : ""}`,
    score: row.importance,
  }));
}

/**
 * Query concept memory and relation memory by concept names.
 */
export async function queryByConcept(
  conceptNames: string[]
): Promise<MemorySnippet[]> {
  const db = await getDb();
  if (!db || conceptNames.length === 0) return [];

  const canonicalNames = conceptNames.map(name => name.trim()).filter(Boolean);
  if (canonicalNames.length === 0) return [];

  const foundConcepts = await db
    .select()
    .from(concepts)
    .where(inArray(concepts.name, canonicalNames))
    .orderBy(desc(concepts.confidence), desc(concepts.lastReinforced))
    .limit(12);

  if (foundConcepts.length === 0) return [];

  const conceptSnippets: MemorySnippet[] = foundConcepts.map(c => ({
    type: "concept" as const,
    content: `${c.name}: ${c.description || "无描述"}`,
    score: c.confidence,
  }));

  const conceptIds = foundConcepts.map(c => c.id);
  const relationRows = await db
    .select()
    .from(conceptRelations)
    .where(
      or(
        inArray(conceptRelations.fromConceptId, conceptIds),
        inArray(conceptRelations.toConceptId, conceptIds)
      )
    )
    .orderBy(desc(conceptRelations.strength), desc(conceptRelations.createdAt))
    .limit(8);

  const idToName = new Map<number, string>(
    foundConcepts.map(c => [c.id, c.name])
  );

  const relationSnippets: MemorySnippet[] = relationRows.map(rel => ({
    type: "relation" as const,
    content: `${idToName.get(rel.fromConceptId) || `#${rel.fromConceptId}`} --${rel.relationType}--> ${idToName.get(rel.toConceptId) || `#${rel.toConceptId}`}`,
    score: rel.strength,
  }));

  return [...conceptSnippets, ...relationSnippets]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

/**
 * Build memory context block for system prompt.
 */
export function buildMemoryContextPrompt(
  contextMemories: MemorySnippet[],
  conceptMemories: MemorySnippet[]
): string {
  const all = [...contextMemories, ...conceptMemories];
  if (all.length === 0) return "";

  const rendered = all
    .slice(0, 12)
    .map((item, index) => `${index + 1}. [${item.type}] ${item.content}`)
    .join("\n");

  return `\n\n[统一记忆检索结果]\n以下是与当前对话最相关的历史记忆，请在回答中自然地利用它们（不要生硬引用编号）：\n${rendered}`;
}

function extractKeywords(input: string): string[] {
  const cjkTokens = input.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  const latinTokens = input.toLowerCase().match(/[a-z0-9_]{3,}/g) || [];

  return Array.from(new Set([...cjkTokens, ...latinTokens])).slice(0, 8);
}
