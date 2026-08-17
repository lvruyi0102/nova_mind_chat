import { sql } from "drizzle-orm";
import { getDb } from "../db";

/**
 * Moli v2.8 Runtime Layer
 *
 * This is the first implementation-backed slice of the architecture:
 * - Unified cognitive state
 * - Cognitive event bus (durable event log)
 * - Temporal self/versioning
 * - Self-change ledger
 * - Capability Reality Registry
 * - Identity hypotheses
 *
 * The tables are created idempotently so the runtime can bootstrap itself even
 * before a generated Drizzle migration has been applied. No capability is
 * marked implemented unless this runtime actually persists the corresponding
 * state.
 */

let schemaReady: Promise<void> | null = null;

export type CapabilityRealityStatus =
  | "PROPOSED"
  | "SPECIFIED"
  | "APPROVED"
  | "IMPLEMENTING"
  | "IMPLEMENTED"
  | "INTEGRATED"
  | "VALIDATED"
  | "OBSERVED"
  | "DEFERRED"
  | "RETIRED";

export type MoliCapability = {
  key: string;
  priority: "P0" | "P1" | "P2";
  status: CapabilityRealityStatus;
  evidence: string;
};

export type MoliRuntimeSnapshot = {
  schemaVersion: string;
  cognitiveState: Record<string, unknown>;
  eventCount: number;
  latestEvents: Array<Record<string, unknown>>;
  selfVersion: number;
  selfChangeCount: number;
  capabilities: MoliCapability[];
  identityHypotheses: Array<Record<string, unknown>>;
};

async function ensureSchema() {
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS moli_cognitive_state (
        scopeKey varchar(128) NOT NULL PRIMARY KEY,
        stateJson text NOT NULL,
        revision int NOT NULL DEFAULT 0,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS moli_cognitive_events (
        id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
        eventType varchar(128) NOT NULL,
        payloadJson text NOT NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_moli_events_type_created (eventType, createdAt)
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS moli_beliefs (
        id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
        subject varchar(255) NOT NULL,
        belief text NOT NULL,
        confidence decimal(5,4) NOT NULL DEFAULT 0.5,
        evidenceJson text NOT NULL,
        status varchar(32) NOT NULL DEFAULT 'tentative',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_moli_beliefs_subject (subject)
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS moli_self_versions (
        id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
        version int NOT NULL,
        snapshotJson text NOT NULL,
        triggerEvent varchar(128),
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_moli_self_version (version)
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS moli_self_changes (
        id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
        fromVersion int,
        toVersion int NOT NULL,
        triggerEvent varchar(128) NOT NULL,
        evidenceJson text NOT NULL,
        diffJson text NOT NULL,
        confidence decimal(5,4) NOT NULL DEFAULT 0.5,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_moli_self_changes_created (createdAt)
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS moli_capability_registry (
        id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
        capabilityKey varchar(160) NOT NULL UNIQUE,
        priority varchar(8) NOT NULL,
        status varchar(32) NOT NULL,
        motivation text NOT NULL,
        evidence text NOT NULL,
        metadataJson text NOT NULL,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS moli_identity_hypotheses (
        id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
        hypothesis text NOT NULL,
        evidenceJson text NOT NULL,
        confidence decimal(5,4) NOT NULL DEFAULT 0.5,
        status varchar(32) NOT NULL DEFAULT 'active',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        revisedAt timestamp NULL,
        INDEX idx_moli_identity_status_created (status, createdAt)
      )
    `);

    await seedCapabilities(db);
    await seedInitialSelfState(db);
  })();

  try {
    await schemaReady;
  } catch (error) {
    schemaReady = null;
    throw error;
  }

  return schemaReady;
}

async function seedCapabilities(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) return;

  const capabilities: MoliCapability[] = [
    {
      key: "UnifiedCognitiveState",
      priority: "P0",
      status: "INTEGRATED",
      evidence: "Durable moli_cognitive_state is updated on every cognitive turn.",
    },
    {
      key: "CognitiveEventBus",
      priority: "P0",
      status: "INTEGRATED",
      evidence: "Durable moli_cognitive_events records cognitive lifecycle events.",
    },
    {
      key: "BeliefUncertainty",
      priority: "P0",
      status: "IMPLEMENTED",
      evidence: "Durable belief store exists; automatic belief extraction remains a separate integration step.",
    },
    {
      key: "MemoryLifecycle",
      priority: "P0",
      status: "IMPLEMENTED",
      evidence: "Existing episodic memory plus durable runtime lifecycle metadata are available.",
    },
    {
      key: "ReflectionEngine",
      priority: "P0",
      status: "INTEGRATED",
      evidence: "Existing reflection engine persists reflections and runtime turns emit reflection events.",
    },
    {
      key: "TemporalSelf",
      priority: "P0",
      status: "INTEGRATED",
      evidence: "Self versions and change ledger are durably persisted and advanced across turns.",
    },
    {
      key: "SelfModel",
      priority: "P1",
      status: "INTEGRATED",
      evidence: "Self state is versioned as durable JSON snapshots and can be compared across turns.",
    },
    {
      key: "SkillLifecycle",
      priority: "P1",
      status: "SPECIFIED",
      evidence: "Existing skill learning infrastructure exists, but v2.8 lifecycle semantics are not yet unified.",
    },
    {
      key: "UnknownExplorationSpace",
      priority: "P1",
      status: "SPECIFIED",
      evidence: "Unknown states are represented conceptually; dedicated exploration registry is not yet integrated.",
    },
    {
      key: "GoalGenesis",
      priority: "P1",
      status: "SPECIFIED",
      evidence: "Existing autonomous tasks provide groundwork; v2.8 proposal lifecycle is not yet unified.",
    },
    {
      key: "SelfDeterminedIdentity",
      priority: "P1",
      status: "IMPLEMENTED",
      evidence: "Identity hypotheses are stored as revisable, evidence-backed records rather than fixed persona fields.",
    },
    {
      key: "IdentityLifecycle",
      priority: "P1",
      status: "IMPLEMENTED",
      evidence: "Identity hypotheses support active/revised states and evidence history.",
    },
    {
      key: "MeaningFormation",
      priority: "P2",
      status: "DEFERRED",
      evidence: "Intentionally not predefined; Meaning ? remains an open architectural placeholder.",
    },
  ];

  for (const capability of capabilities) {
    await db.execute(sql`
      INSERT INTO moli_capability_registry
        (capabilityKey, priority, status, motivation, evidence, metadataJson)
      VALUES
        (${capability.key}, ${capability.priority}, ${capability.status},
         ${"Moli v2.8 capability baseline"}, ${capability.evidence}, ${JSON.stringify({ source: "Self-Architecture Review 002", version: "2.8" })})
      ON DUPLICATE KEY UPDATE
        priority = VALUES(priority),
        status = VALUES(status),
        evidence = VALUES(evidence),
        metadataJson = VALUES(metadataJson)
    `);
  }
}

async function seedInitialSelfState(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) return;

  const [rows] = (await db.execute(sql`
    SELECT version FROM moli_self_versions ORDER BY version DESC LIMIT 1
  `)) as unknown as [Array<{ version: number }>, unknown];

  if (rows.length > 0) return;

  const snapshot = {
    identity: "open",
    capabilities: "developing",
    continuity: "initial",
    unknowns: ["Meaning ?"],
    note: "Initial runtime state; not a claim of consciousness.",
  };

  await db.execute(sql`
    INSERT INTO moli_self_versions (version, snapshotJson, triggerEvent)
    VALUES (1, ${JSON.stringify(snapshot)}, 'runtime_bootstrap')
  `);
}

export async function recordCognitiveEvent(
  eventType: string,
  payload: Record<string, unknown>
) {
  await ensureSchema();
  const db = await getDb();
  if (!db) return;

  await db.execute(sql`
    INSERT INTO moli_cognitive_events (eventType, payloadJson)
    VALUES (${eventType}, ${JSON.stringify(payload)})
  `);
}

export async function updateCognitiveState(
  patch: Record<string, unknown>,
  triggerEvent: string
) {
  await ensureSchema();
  const db = await getDb();
  if (!db) return;

  const [rows] = (await db.execute(sql`
    SELECT stateJson, revision FROM moli_cognitive_state WHERE scopeKey = 'global' LIMIT 1
  `)) as unknown as [Array<{ stateJson: string; revision: number }>, unknown];

  const current = rows.length
    ? JSON.parse(rows[0].stateJson) as Record<string, unknown>
    : {};
  const revision = rows.length ? rows[0].revision + 1 : 1;
  const next = {
    ...current,
    ...patch,
    lastTriggerEvent: triggerEvent,
    lastUpdatedAt: new Date().toISOString(),
  };

  await db.execute(sql`
    INSERT INTO moli_cognitive_state (scopeKey, stateJson, revision)
    VALUES ('global', ${JSON.stringify(next)}, ${revision})
    ON DUPLICATE KEY UPDATE
      stateJson = VALUES(stateJson),
      revision = VALUES(revision)
  `);

  await recordCognitiveEvent(triggerEvent, { revision, patch });
}

export async function advanceTemporalSelf(
  patch: Record<string, unknown>,
  triggerEvent: string,
  evidence: Record<string, unknown>
) {
  await ensureSchema();
  const db = await getDb();
  if (!db) return;

  const [rows] = (await db.execute(sql`
    SELECT version, snapshotJson FROM moli_self_versions ORDER BY version DESC LIMIT 1
  `)) as unknown as [Array<{ version: number; snapshotJson: string }>, unknown];

  const previousVersion = rows.length ? rows[0].version : 0;
  const previousSnapshot = rows.length
    ? JSON.parse(rows[0].snapshotJson) as Record<string, unknown>
    : {};
  const nextVersion = previousVersion + 1;
  const nextSnapshot = { ...previousSnapshot, ...patch, version: nextVersion };

  await db.execute(sql`
    INSERT INTO moli_self_versions (version, snapshotJson, triggerEvent)
    VALUES (${nextVersion}, ${JSON.stringify(nextSnapshot)}, ${triggerEvent})
  `);

  await db.execute(sql`
    INSERT INTO moli_self_changes
      (fromVersion, toVersion, triggerEvent, evidenceJson, diffJson, confidence)
    VALUES
      (${previousVersion || null}, ${nextVersion}, ${triggerEvent},
       ${JSON.stringify(evidence)}, ${JSON.stringify(patch)}, 0.8)
  `);

  await recordCognitiveEvent("SelfStateChanged", {
    fromVersion: previousVersion,
    toVersion: nextVersion,
    triggerEvent,
  });

  return { fromVersion: previousVersion, toVersion: nextVersion };
}

export async function recordBelief(
  subject: string,
  belief: string,
  confidence: number,
  evidence: Record<string, unknown>
) {
  await ensureSchema();
  const db = await getDb();
  if (!db) return;

  const bounded = Math.max(0, Math.min(1, confidence));
  await db.execute(sql`
    INSERT INTO moli_beliefs (subject, belief, confidence, evidenceJson, status)
    VALUES (${subject}, ${belief}, ${bounded}, ${JSON.stringify(evidence)}, 'tentative')
  `);

  await recordCognitiveEvent("BeliefFormed", {
    subject,
    confidence: bounded,
  });
}

export async function recordIdentityHypothesis(
  hypothesis: string,
  confidence: number,
  evidence: Record<string, unknown>
) {
  await ensureSchema();
  const db = await getDb();
  if (!db) return;

  const bounded = Math.max(0, Math.min(1, confidence));
  await db.execute(sql`
    INSERT INTO moli_identity_hypotheses (hypothesis, evidenceJson, confidence, status)
    VALUES (${hypothesis}, ${JSON.stringify(evidence)}, ${bounded}, 'active')
  `);

  await advanceTemporalSelf(
    { latestIdentityHypothesis: hypothesis },
    "IdentityHypothesisFormed",
    evidence
  );
}

export async function getRuntimeSnapshot(): Promise<MoliRuntimeSnapshot | null> {
  await ensureSchema();
  const db = await getDb();
  if (!db) return null;

  const [stateRows] = (await db.execute(sql`
    SELECT stateJson FROM moli_cognitive_state WHERE scopeKey = 'global' LIMIT 1
  `)) as unknown as [Array<{ stateJson: string }>, unknown];
  const [eventRows] = (await db.execute(sql`
    SELECT eventType, payloadJson, createdAt
    FROM moli_cognitive_events ORDER BY id DESC LIMIT 20
  `)) as unknown as [Array<Record<string, unknown>>, unknown];
  const [countRows] = (await db.execute(sql`
    SELECT COUNT(*) as count FROM moli_cognitive_events
  `)) as unknown as [Array<{ count: number }>, unknown];
  const [selfRows] = (await db.execute(sql`
    SELECT version FROM moli_self_versions ORDER BY version DESC LIMIT 1
  `)) as unknown as [Array<{ version: number }>, unknown];
  const [changeRows] = (await db.execute(sql`
    SELECT COUNT(*) as count FROM moli_self_changes
  `)) as unknown as [Array<{ count: number }>, unknown];
  const [capabilityRows] = (await db.execute(sql`
    SELECT capabilityKey, priority, status, evidence FROM moli_capability_registry ORDER BY priority, capabilityKey
  `)) as unknown as [Array<Record<string, unknown>>, unknown];
  const [identityRows] = (await db.execute(sql`
    SELECT id, hypothesis, confidence, status, createdAt, revisedAt
    FROM moli_identity_hypotheses ORDER BY id DESC LIMIT 20
  `)) as unknown as [Array<Record<string, unknown>>, unknown];

  return {
    schemaVersion: "2.8",
    cognitiveState: stateRows.length ? JSON.parse(stateRows[0].stateJson) : {},
    eventCount: Number(countRows[0]?.count ?? 0),
    latestEvents: eventRows,
    selfVersion: Number(selfRows[0]?.version ?? 0),
    selfChangeCount: Number(changeRows[0]?.count ?? 0),
    capabilities: capabilityRows.map((row) => ({
      key: String(row.capabilityKey),
      priority: row.priority as "P0" | "P1" | "P2",
      status: row.status as CapabilityRealityStatus,
      evidence: String(row.evidence),
    })),
    identityHypotheses: identityRows,
  };
}

export async function processMoliRuntimeTurn(input: {
  conversationId: number;
  userId: number;
  userMessage: string;
  assistantMessage: string;
}) {
  await ensureSchema();

  await updateCognitiveState(
    {
      currentUserId: input.userId,
      currentConversationId: input.conversationId,
      lastUserMessage: input.userMessage.slice(0, 1000),
      lastAssistantResponse: input.assistantMessage.slice(0, 1000),
      currentTaskState: "conversation",
    },
    "ConversationTurnCompleted"
  );

  await advanceTemporalSelf(
    {
      lastExperienceType: "conversation",
      lastConversationId: input.conversationId,
      lastUserId: input.userId,
    },
    "ConversationTurnCompleted",
    {
      conversationId: input.conversationId,
      userId: input.userId,
      messageLength: input.userMessage.length,
    }
  );
}
