import { afterEach, describe, expect, it } from "vitest";
import { ToolAdapterRegistryV4, type ToolAdapterV4 } from "./toolAdapterRegistryV4";

function createAdapter(overrides: Partial<ToolAdapterV4> = {}): ToolAdapterV4 {
  return {
    name: "test-provider",
    capabilities: [{
      id: "image.generate",
      modality: "image",
      description: "Generate an image",
      outputMediaTypes: ["image/png"],
      supportsAsync: false,
      enabled: true,
    }],
    execute: async () => ({
      status: "SUCCEEDED",
      artifacts: [{ uri: "https://assets.example.test/image.png", mediaType: "image/png" }],
    }),
    ...overrides,
  };
}

describe("ToolAdapterRegistryV4", () => {
  let registry: ToolAdapterRegistryV4;

  afterEach(() => {
    registry = new ToolAdapterRegistryV4();
  });

  it("lists enabled capabilities by modality", () => {
    registry = new ToolAdapterRegistryV4();
    registry.register(createAdapter());
    registry.register(createAdapter({
      name: "disabled-provider",
      capabilities: [{
        id: "video.generate",
        modality: "video",
        description: "Disabled video provider",
        supportsAsync: true,
        enabled: false,
      }],
    }));

    expect(registry.listCapabilities({ modality: "image" })).toHaveLength(1);
    expect(registry.listCapabilities()).toHaveLength(1);
    expect(registry.listCapabilities({ enabledOnly: false })).toHaveLength(2);
  });

  it("rejects duplicate adapters and duplicate capability IDs", () => {
    registry = new ToolAdapterRegistryV4();
    registry.register(createAdapter());
    expect(() => registry.register(createAdapter())).toThrow(/already registered/);

    expect(() => registry.register(createAdapter({
      name: "bad-provider",
      capabilities: [
        {
          id: "same",
          modality: "image",
          description: "First",
          supportsAsync: false,
          enabled: true,
        },
        {
          id: "same",
          modality: "video",
          description: "Second",
          supportsAsync: false,
          enabled: true,
        },
      ],
    }))).toThrow(/duplicate capability/);
  });

  it("executes through a registered adapter and checks artifact evidence", async () => {
    registry = new ToolAdapterRegistryV4();
    registry.register(createAdapter());

    const result = await registry.execute({
      adapterName: "test-provider",
      request: {
        taskId: "task-1",
        stepId: "step-1",
        capabilityId: "image.generate",
        input: { prompt: "A lighthouse" },
        idempotencyKey: "task-1:step-1",
        timeoutMs: 10_000,
      },
      budget: { maxToolCalls: 2, maxRetriesPerStep: 1 },
      usage: { toolCalls: 0 },
    });

    expect(result.status).toBe("SUCCEEDED");
    expect(result.artifacts).toHaveLength(1);
  });

  it("rejects success responses without artifact references", async () => {
    registry = new ToolAdapterRegistryV4();
    registry.register(createAdapter({
      execute: async () => ({ status: "SUCCEEDED", artifacts: [] }),
    }));

    await expect(registry.execute({
      adapterName: "test-provider",
      request: {
        taskId: "task-1",
        stepId: "step-1",
        capabilityId: "image.generate",
        input: {},
        idempotencyKey: "task-1:step-1",
        timeoutMs: 10_000,
      },
      budget: { maxToolCalls: 2, maxRetriesPerStep: 1 },
      usage: { toolCalls: 0 },
    })).rejects.toThrow(/without any artifact references/);
  });

  it("rejects unknown adapters and disabled capabilities", async () => {
    registry = new ToolAdapterRegistryV4();
    await expect(registry.execute({
      adapterName: "missing",
      request: {
        taskId: "task-1",
        stepId: "step-1",
        capabilityId: "image.generate",
        input: {},
        idempotencyKey: "key",
        timeoutMs: 1000,
      },
      budget: { maxToolCalls: 2, maxRetriesPerStep: 1 },
      usage: { toolCalls: 0 },
    })).rejects.toThrow(/not registered/);
  });
});
