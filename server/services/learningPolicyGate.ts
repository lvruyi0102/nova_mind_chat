import { and, desc, eq, gte, lt } from "drizzle-orm";
import { getDb } from "../db";
import { conceptRelations, cognitiveLog } from "../../drizzle/schema";

export type LearningAction = "relation_reinforcement" | "rule_formation";
export type GateDecision = "allow" | "throttle" | "defer";

export interface LearningGateInput {
  conversationId: number;
  action: LearningAction;
  confidenceDelta?: number;
}

export interface LearningGateResult {
  decision: GateDecision;
  reason: string;
  adjustedConfidenceDelta: number;
}

const POLICY = {
  MAX_RELATION_WRITES_PER_CYCLE: 6,
  MAX_RULE_WRITES_PER_CYCLE: 2,
  MAX_RELATION_WRITES_PER_SESSION: 24,
  MAX_RULE_WRITES_PER_SESSION: 8,
  MAX_CONFIDENCE_DELTA: 2,
  RELATION_DECAY_RATIO: 0.97,
  RELATION_DECAY_MIN_STRENGTH: 2,
} as const;

/**
 * LearningPolicyGate
 * Central gate for every learning-loop write operation.
 */
export async function evaluateLearningWrite(
  input: LearningGateInput,
  cycleStats: { relationWrites: number; ruleWrites: number }
): Promise<LearningGateResult> {
  const db = await getDb();
  if (!db) {
    return {
      decision: "defer",
      reason: "db_unavailable",
      adjustedConfidenceDelta: 0,
    };
  }

  const confidenceDelta = Math.max(
    0,
    Math.min(POLICY.MAX_CONFIDENCE_DELTA, input.confidenceDelta ?? 1)
  );

  if (
    input.action === "relation_reinforcement" &&
    cycleStats.relationWrites >= POLICY.MAX_RELATION_WRITES_PER_CYCLE
  ) {
    return {
      decision: "throttle",
      reason: "cycle_relation_limit",
      adjustedConfidenceDelta: 1,
    };
  }

  if (
    input.action === "rule_formation" &&
    cycleStats.ruleWrites >= POLICY.MAX_RULE_WRITES_PER_CYCLE
  ) {
    return {
      decision: "defer",
      reason: "cycle_rule_limit",
      adjustedConfidenceDelta: 0,
    };
  }

  const recent = await db
    .select()
    .from(cognitiveLog)
    .where(
      and(
        eq(cognitiveLog.conversationId, input.conversationId),
        gte(cognitiveLog.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
      )
    )
    .orderBy(desc(cognitiveLog.createdAt))
    .limit(120);

  const relationSessionWrites = recent.filter(
    item => item.eventType === "relation_reinforcement_applied"
  ).length;
  const ruleSessionWrites = recent.filter(
    item => item.eventType === "rule_transition"
  ).length;

  if (
    input.action === "relation_reinforcement" &&
    relationSessionWrites >= POLICY.MAX_RELATION_WRITES_PER_SESSION
  ) {
    return {
      decision: "throttle",
      reason: "session_relation_limit",
      adjustedConfidenceDelta: 1,
    };
  }

  if (
    input.action === "rule_formation" &&
    ruleSessionWrites >= POLICY.MAX_RULE_WRITES_PER_SESSION
  ) {
    return {
      decision: "defer",
      reason: "session_rule_limit",
      adjustedConfidenceDelta: 0,
    };
  }

  return {
    decision: "allow",
    reason: "policy_ok",
    adjustedConfidenceDelta: confidenceDelta,
  };
}

/**
 * Lightweight relation decay to reduce stale memory dominance.
 */
export async function decayOldRelations(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oldRows = await db
    .select()
    .from(conceptRelations)
    .where(lt(conceptRelations.createdAt, sevenDaysAgo))
    .orderBy(desc(conceptRelations.createdAt))
    .limit(80);

  let updated = 0;
  for (const rel of oldRows) {
    const nextStrength = Math.max(
      POLICY.RELATION_DECAY_MIN_STRENGTH,
      Math.floor(rel.strength * POLICY.RELATION_DECAY_RATIO)
    );

    if (nextStrength < rel.strength) {
      await db
        .update(conceptRelations)
        .set({ strength: nextStrength })
        .where(eq(conceptRelations.id, rel.id));
      updated++;
    }
  }

  return updated;
}
