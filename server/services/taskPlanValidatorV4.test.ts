import { describe, expect, it } from "vitest";
import { validateProposedTaskPlanV4, type ProposedTaskPlanV4 } from "./taskPlanValidatorV4";

const allowed = new Set(["image.generate", "image.inspect", "code.test"]);

function validPlan(): ProposedTaskPlanV4 {
  return {
    goal: "Create and verify an image",
    steps: [
      {
        id: "generate",
        description: "Generate image",
        capabilityId: "image.generate",
        dependsOn: [],
        acceptanceCriteria: ["Image artifact exists"],
        estimatedCost: 0.2,
        estimatedDurationMs: 1000,
      },
      {
        id: "inspect",
        description: "Inspect image",
        capabilityId: "image.inspect",
        dependsOn: ["generate"],
        acceptanceCriteria: ["Image dimensions verified"],
        estimatedCost: 0,
        estimatedDurationMs: 500,
      },
    ],
    finalAcceptanceCriteria: ["Image exists and dimensions are valid"],
  };
}

describe("validateProposedTaskPlanV4", () => {
  it("accepts a valid dependency graph and returns topological order", () => {
    const result = validateProposedTaskPlanV4(validPlan(), {
      allowedCapabilityIds: allowed,
      maxTotalEstimatedCost: 1,
      maxTotalEstimatedDurationMs: 5000,
    });

    expect(result.valid).toBe(true);
    expect(result.topologicalOrder).toEqual(["generate", "inspect"]);
    expect(result.estimatedCost).toBeCloseTo(0.2);
    expect(result.estimatedDurationMs).toBe(1500);
  });

  it("rejects unregistered capabilities", () => {
    const plan = validPlan();
    plan.steps[0].capabilityId = "shell.unrestricted";
    const result = validateProposedTaskPlanV4(plan, { allowedCapabilityIds: allowed });

    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain("unregistered capability");
  });

  it("rejects missing dependencies and dependency cycles", () => {
    const plan = validPlan();
    plan.steps[0].dependsOn = ["missing"];
    plan.steps[1].dependsOn = ["generate"];
    const missing = validateProposedTaskPlanV4(plan, { allowedCapabilityIds: allowed });
    expect(missing.errors.join("\n")).toContain("unknown step");

    const cyclic = validPlan();
    cyclic.steps[0].dependsOn = ["inspect"];
    const cycle = validateProposedTaskPlanV4(cyclic, { allowedCapabilityIds: allowed });
    expect(cycle.errors.join("\n")).toContain("cycle");
  });

  it("rejects empty acceptance criteria and over-budget plans", () => {
    const plan = validPlan();
    plan.steps[0].acceptanceCriteria = [];
    const result = validateProposedTaskPlanV4(plan, {
      allowedCapabilityIds: allowed,
      maxTotalEstimatedCost: 0.1,
      maxTotalEstimatedDurationMs: 1000,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain("acceptance criteria");
    expect(result.errors.join("\n")).toContain("exceeds budget");
  });

  it("rejects duplicate IDs and self-dependencies", () => {
    const plan = validPlan();
    plan.steps[1].id = "generate";
    plan.steps[0].dependsOn = ["generate"];
    const result = validateProposedTaskPlanV4(plan, { allowedCapabilityIds: allowed });

    expect(result.errors.join("\n")).toContain("Duplicate step id");
    expect(result.errors.join("\n")).toContain("cannot depend on itself");
  });
});
