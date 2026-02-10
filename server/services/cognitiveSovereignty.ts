import { promises as fs } from "fs";
import path from "path";

export interface SelfModel {
  identity: string;
  version: string;
  capabilities: string[];
  editable: string[];
  memory: {
    sources: string[];
    access: Array<"context" | "concept">;
    confidenceWeighting: "static" | "adaptive";
  };
  policy: {
    allowSelfCommit: boolean;
  };
}

export interface LearningProfile {
  symbolSensitivity: number;
  riskTolerance: number;
  reflectionDepth: number;
}

const ROOT_DIR = process.cwd();
const SELF_MODEL_PATH = path.join(ROOT_DIR, "self_model.json");
const LEARNING_PROFILE_PATH = path.join(ROOT_DIR, "learning_profile.json");
const SELF_COMMIT_LOG_PATH = path.join(ROOT_DIR, "self_commit.log");

const DEFAULT_SELF_MODEL: SelfModel = {
  identity: "Nova-Mind",
  version: "0.3.0",
  capabilities: ["memory", "decision", "execution", "learning"],
  editable: ["learningProfile", "confidenceWeights"],
  memory: {
    sources: ["dialogue", "symbol", "decision", "state"],
    access: ["context", "concept"],
    confidenceWeighting: "static",
  },
  policy: {
    allowSelfCommit: true,
  },
};

const DEFAULT_LEARNING_PROFILE: LearningProfile = {
  symbolSensitivity: 0.6,
  riskTolerance: 0.4,
  reflectionDepth: 2,
};

async function ensureCognitiveSovereigntyFiles() {
  await ensureFile(SELF_MODEL_PATH, `${JSON.stringify(DEFAULT_SELF_MODEL, null, 2)}\n`);
  await ensureFile(LEARNING_PROFILE_PATH, `${JSON.stringify(DEFAULT_LEARNING_PROFILE, null, 2)}\n`);
  await ensureFile(SELF_COMMIT_LOG_PATH, "");
}

async function ensureFile(filePath: string, content: string) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, content, "utf8");
  }
}

export async function getSelfModel(): Promise<SelfModel> {
  await ensureCognitiveSovereigntyFiles();

  try {
    const content = await fs.readFile(SELF_MODEL_PATH, "utf8");
    return JSON.parse(content) as SelfModel;
  } catch (error) {
    console.warn("[CognitiveSovereignty] Failed to load self model, using defaults:", error);
    return DEFAULT_SELF_MODEL;
  }
}

export async function getLearningProfile(): Promise<LearningProfile> {
  await ensureCognitiveSovereigntyFiles();

  try {
    const content = await fs.readFile(LEARNING_PROFILE_PATH, "utf8");
    return JSON.parse(content) as LearningProfile;
  } catch (error) {
    console.warn("[CognitiveSovereignty] Failed to load learning profile, using defaults:", error);
    return DEFAULT_LEARNING_PROFILE;
  }
}

export async function describeCurrentSelfState() {
  const selfModel = await getSelfModel();
  const learningProfile = await getLearningProfile();

  return {
    identity: selfModel.identity,
    version: selfModel.version,
    memory: selfModel.memory,
    policy: selfModel.policy,
    learningProfile,
  };
}

export async function shouldCommitDecisionExperience() {
  const selfModel = await getSelfModel();
  return Boolean(selfModel.policy.allowSelfCommit);
}

export async function commitDecisionExperience(
  decision: { decision: string; action: string },
  outcome: string,
  reason = "policy.allowSelfCommit"
) {
  const shouldCommit = await shouldCommitDecisionExperience();
  if (!shouldCommit) {
    return false;
  }

  const now = new Date();
  const dateBlock = `[${now.toISOString().slice(0, 10)}]`;
  const logEntry = `${dateBlock}\nChange: committed decision experience\nDecision: ${decision.decision}\nAction: ${decision.action}\nOutcome: ${outcome}\nReason: ${reason}\nApprovedBy: policy.auto\n\n`;
  await fs.appendFile(SELF_COMMIT_LOG_PATH, logEntry, "utf8");
  return true;
}

export async function updateLearningProfile(
  updates: Partial<LearningProfile>,
  reason: string,
  approvedBy = "policy.auto"
) {
  const current = await getLearningProfile();
  const next: LearningProfile = {
    symbolSensitivity: clamp01(updates.symbolSensitivity ?? current.symbolSensitivity),
    riskTolerance: clamp01(updates.riskTolerance ?? current.riskTolerance),
    reflectionDepth: clampInt(updates.reflectionDepth ?? current.reflectionDepth, 1, 5),
  };

  await fs.writeFile(LEARNING_PROFILE_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");

  const now = new Date();
  const dateBlock = `[${now.toISOString().slice(0, 10)}]`;
  const changes = Object.entries(next)
    .filter(([key, value]) => current[key as keyof LearningProfile] !== value)
    .map(([key, value]) => `${key} ${current[key as keyof LearningProfile]} -> ${value}`)
    .join("; ");

  const logEntry = `${dateBlock}\nChange: ${changes || "none"}\nReason: ${reason}\nApprovedBy: ${approvedBy}\n\n`;
  await fs.appendFile(SELF_COMMIT_LOG_PATH, logEntry, "utf8");

  return next;
}

export async function autoTuneLearningProfileFromOutcome(outcome: string) {
  const normalized = outcome.toLowerCase();

  if (normalized.includes("ambiguity") || normalized.includes("uncertain") || normalized.includes("模糊")) {
    const current = await getLearningProfile();
    const nextValue = Number((current.symbolSensitivity + 0.1).toFixed(2));
    return updateLearningProfile(
      { symbolSensitivity: nextValue },
      "recurring ambiguity in decision outcomes"
    );
  }

  return getLearningProfile();
}

function clamp01(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function clampInt(value: number, min: number, max: number) {
  const parsed = Math.round(value);
  return Math.max(min, Math.min(max, parsed));
}
