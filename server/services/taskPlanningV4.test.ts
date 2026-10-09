import { afterEach, describe, expect, it, vi } from "vitest";
import { invokeLLM } from "../_core/llm";
import { planTaskV4 } from "./taskPlanningV4";
import { toolAdapterRegistryV4, type ToolAdapterV4 } from "./toolAdapterRegistryV4";

vi.mock("../_core/llm", () => ({ invokeLLM: vi.fn() }));

const adapterName = "task-planning-test-adapter";

function registerTestAdapter() {
  const adapter: ToolAdapterV4 = {
    name: adapterName,
    capabilities: [{
      id: "test.image.generate",
      modality: "image",
      description: "Test image generation capability",
      supportsAsync: false,
      enabled: true,
    }],
    execute: async () => ({
      status: "SUCCEEDED",
      artifacts: [{ uri: "https://assets.example.test/test.png", mediaType: "image/png" }],
    }),
  };
  toolAdapterRegistryV4.register(adapter);
}

afterEach(() => {
  toolAdapterRegistryV4.unregister(adapterName);
  vi.clearAllMocks();
});

describe("planTaskV4", () => {
  it("blocks executable planning when no real capabilities are registered", async () => {
    await expect(planTaskV4({ goal: "Create an image" })).rejects.toThrow(
      /No real tool capabilities are registered/,
    );
  });

  it("returns a plan only after capability and dependency validation", async () => {
    registerTestAdapter();
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            goal: "Create a test image",
            steps: [{
              id: "generate",
              description: "Generate an image",
              capabilityId: "test.image.generate",
              dependsOn: [],
              acceptanceCriteria: ["Image file exists"],
              estimatedCost: 0,
              estimatedDurationMs: 1000,
            }],
            finalAcceptanceCriteria: ["Image file exists"],
          }),
        },
      }],
    } as any);

    const result = await planTaskV4({ goal: "Create a test image", maxSteps: 3 });

    expect(result.validation.valid).toBe(true);
    expect(result.validation.topologicalOrder).toEqual(["generate"]);
    expect(result.availableCapabilities[0].capabilityId).toBe("test.image.generate");
  });

  it("rejects a model plan that invents an unregistered capability", async () => {
    registerTestAdapter();
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            goal: "Run an unrestricted command",
            steps: [{
              id: "execute",
              description: "Run command",
              capabilityId: "shell.unrestricted",
              dependsOn: [],
              acceptanceCriteria: ["Command completes"],
              estimatedCost: 0,
              estimatedDurationMs: 1000,
            }],
            finalAcceptanceCriteria: ["Command completes"],
          }),
        },
      }],
    } as any);

    await expect(planTaskV4({ goal: "Run a command" })).rejects.toMatchObject({
      name: "TaskPlanningErrorV4",
      details: expect.arrayContaining([expect.stringContaining("unregistered capability")]),
    });
  });

  it("rejects malformed JSON from the planner", async () => {
    registerTestAdapter();
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{ message: { content: "{not-json" } }],
    } as any);

    await expect(planTaskV4({ goal: "Create an image" })).rejects.toThrow(/invalid JSON/);
  });
});
