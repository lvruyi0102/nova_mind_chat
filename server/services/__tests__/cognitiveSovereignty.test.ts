import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import {
  describeCurrentSelfState,
  getLearningProfile,
  shouldCommitDecisionExperience,
  commitDecisionExperience,
  updateLearningProfile,
  autoTuneLearningProfileFromOutcome,
} from "../cognitiveSovereignty";

const ROOT = process.cwd();
const SELF_MODEL = path.join(ROOT, "self_model.json");
const LEARNING_PROFILE = path.join(ROOT, "learning_profile.json");
const SELF_COMMIT_LOG = path.join(ROOT, "self_commit.log");

let backup: Record<string, string | null> = {};

async function readOrNull(filePath: string) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

describe("cognitive sovereignty", () => {
  beforeEach(async () => {
    backup = {
      [SELF_MODEL]: await readOrNull(SELF_MODEL),
      [LEARNING_PROFILE]: await readOrNull(LEARNING_PROFILE),
      [SELF_COMMIT_LOG]: await readOrNull(SELF_COMMIT_LOG),
    };

    await fs.writeFile(
      SELF_MODEL,
      JSON.stringify(
        {
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
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    await fs.writeFile(
      LEARNING_PROFILE,
      JSON.stringify(
        {
          symbolSensitivity: 0.6,
          riskTolerance: 0.4,
          reflectionDepth: 2,
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    await fs.writeFile(SELF_COMMIT_LOG, "", "utf8");
  });

  afterEach(async () => {
    for (const [filePath, content] of Object.entries(backup)) {
      if (content === null) {
        try {
          await fs.unlink(filePath);
        } catch {
          // ignore
        }
      } else {
        await fs.writeFile(filePath, content, "utf8");
      }
    }
  });

  it("describes current self state", async () => {
    const state = await describeCurrentSelfState();
    expect(state.identity).toBe("Nova-Mind");
    expect(state.memory.access).toEqual(["context", "concept"]);
    expect(state.learningProfile.reflectionDepth).toBe(2);
  });

  it("commits decision experience when policy allows", async () => {
    const canCommit = await shouldCommitDecisionExperience();
    expect(canCommit).toBe(true);

    const committed = await commitDecisionExperience(
      { decision: "reflect", action: "review recent outcomes" },
      "created reflect task"
    );
    expect(committed).toBe(true);

    const log = await fs.readFile(SELF_COMMIT_LOG, "utf8");
    expect(log).toContain("Decision: reflect");
    expect(log).toContain("Outcome: created reflect task");
  });

  it("updates learning profile in constrained range", async () => {
    const updated = await updateLearningProfile(
      {
        symbolSensitivity: 1.2,
        riskTolerance: -0.1,
        reflectionDepth: 10,
      },
      "test constraint"
    );

    expect(updated.symbolSensitivity).toBe(1);
    expect(updated.riskTolerance).toBe(0);
    expect(updated.reflectionDepth).toBe(5);

    const persisted = await getLearningProfile();
    expect(persisted).toEqual(updated);
  });

  it("auto tunes sensitivity on ambiguity outcomes", async () => {
    const before = await getLearningProfile();
    const after = await autoTuneLearningProfileFromOutcome("recurring ambiguity in decision outcomes");

    expect(after.symbolSensitivity).toBeGreaterThan(before.symbolSensitivity);
  });
});
