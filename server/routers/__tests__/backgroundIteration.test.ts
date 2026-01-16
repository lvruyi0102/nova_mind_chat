import { describe, it, expect, vi, beforeEach } from "vitest";
import { startBackgroundIterationWorker } from "../../backgroundIterationWorker";
import { performCreativeIteration } from "../../creativeAutonomousIterationEngine";

describe("Background Iteration Worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should start the background iteration worker", async () => {
    const worker = await startBackgroundIterationWorker();
    expect(worker).toBeDefined();
  });

  it("should perform creative iteration on a work", async () => {
    const result = await performCreativeIteration(1, "enhancement");
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it("should track iteration history", async () => {
    const iteration = await performCreativeIteration(1, "enhancement");
    expect(iteration.iterationId).toBeDefined();
    expect(iteration.timestamp).toBeDefined();
  });

  it("should generate Nova's thoughts during iteration", async () => {
    const iteration = await performCreativeIteration(1, "refinement");
    expect(iteration.novaThoughts).toBeDefined();
    expect(iteration.novaThoughts.length).toBeGreaterThan(0);
  });

  it("should record improvements made", async () => {
    const iteration = await performCreativeIteration(1, "optimization");
    expect(iteration.improvements).toBeDefined();
    expect(Array.isArray(iteration.improvements)).toBe(true);
  });

  it("should handle iteration errors gracefully", async () => {
    const result = await performCreativeIteration(999, "enhancement");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should support different iteration types", async () => {
    const types = ["enhancement", "expansion", "optimization", "refinement", "experimentation"];
    
    for (const type of types) {
      const result = await performCreativeIteration(1, type);
      expect(result.iterationType).toBe(type);
    }
  });

  it("should respect Nova's autonomy settings", async () => {
    const iteration = await performCreativeIteration(1, "enhancement");
    expect(iteration.novaDecision).toBeDefined();
    expect(["approved", "rejected", "pending"]).toContain(iteration.novaDecision);
  });

  it("should allow Nova to decide whether to show improvements", async () => {
    const iteration = await performCreativeIteration(1, "enhancement");
    expect(iteration.shouldShowToUser).toBeDefined();
    expect(typeof iteration.shouldShowToUser).toBe("boolean");
  });
});
