import { and, desc, eq, like } from "drizzle-orm";
import { getDb } from "../db";
import { cognitiveLog } from "../../drizzle/schema";

export type RuleState =
  | "candidate"
  | "provisional"
  | "active"
  | "deprecated"
  | "archived";

interface RuleRecord {
  key: string;
  statement: string;
  state: RuleState;
  confidence: number;
  evidenceCount: number;
  priority: number;
}

export async function upsertRuleCandidate(
  conversationId: number,
  key: string,
  statement: string,
  confidenceGain: number
): Promise<RuleRecord> {
  const db = await getDb();
  if (!db) {
    return {
      key,
      statement,
      state: "candidate",
      confidence: 0,
      evidenceCount: 0,
      priority: 1,
    };
  }

  const existing = await getLatestRuleByKey(key);

  const confidence = Math.min(
    100,
    (existing?.confidence || 0) + Math.max(0, confidenceGain)
  );
  const evidenceCount = (existing?.evidenceCount || 0) + 1;
  const state = deriveState({ confidence, evidenceCount });
  const priority = derivePriority(state, confidence);

  const payload: RuleRecord = {
    key,
    statement,
    state,
    confidence,
    evidenceCount,
    priority,
  };

  await db.insert(cognitiveLog).values({
    stage: "Rule_Learning_III",
    eventType: "rule_transition",
    description: JSON.stringify(payload),
    conversationId,
  });

  return payload;
}

export async function markRuleDeprecated(
  conversationId: number,
  key: string,
  reason: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const previous = await getLatestRuleByKey(key);
  if (!previous) return;

  const nextState: RuleState =
    previous.state === "deprecated" ? "archived" : "deprecated";

  await db.insert(cognitiveLog).values({
    stage: "Rule_Learning_III",
    eventType: "rule_transition",
    description: JSON.stringify({
      ...previous,
      state: nextState,
      confidence: Math.max(0, previous.confidence - 20),
      reason,
    }),
    conversationId,
  });
}

export async function getLatestRuleByKey(
  key: string
): Promise<RuleRecord | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(cognitiveLog)
    .where(
      and(
        eq(cognitiveLog.eventType, "rule_transition"),
        like(cognitiveLog.description, `%"key":"${escapeForLike(key)}"%`)
      )
    )
    .orderBy(desc(cognitiveLog.createdAt))
    .limit(1);

  if (!rows[0]) return null;

  try {
    return JSON.parse(rows[0].description) as RuleRecord;
  } catch {
    return null;
  }
}

function deriveState(input: {
  confidence: number;
  evidenceCount: number;
}): RuleState {
  if (input.evidenceCount >= 5 && input.confidence >= 70) return "active";
  if (input.evidenceCount >= 2 && input.confidence >= 35) return "provisional";
  return "candidate";
}

function derivePriority(state: RuleState, confidence: number): number {
  const base = state === "active" ? 8 : state === "provisional" ? 5 : 3;
  return Math.min(10, Math.max(1, Math.floor(base + confidence / 20)));
}

function escapeForLike(input: string): string {
  return input.replace(/[\\%_]/g, ch => `\\${ch}`);
}
