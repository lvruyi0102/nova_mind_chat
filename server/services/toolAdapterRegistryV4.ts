import {
  assertToolResultIsConsistent,
  assertWithinExecutionBudget,
  type ExecutionBudget,
  type ExecutionUsage,
  type ToolExecutionResult,
} from "./executionEngineV4";

export type ToolModality =
  | "image"
  | "music"
  | "audio"
  | "video"
  | "3d"
  | "code"
  | "game"
  | "text"
  | "composite";

export interface ToolCapabilityV4 {
  id: string;
  modality: ToolModality;
  description: string;
  inputFormats?: string[];
  outputMediaTypes?: string[];
  supportsAsync: boolean;
  enabled: boolean;
}

export interface ToolExecutionRequestV4 {
  taskId: string;
  stepId: string;
  capabilityId: string;
  input: Record<string, unknown>;
  idempotencyKey: string;
  timeoutMs: number;
}

export interface ToolAdapterV4 {
  name: string;
  capabilities: ToolCapabilityV4[];
  execute(request: ToolExecutionRequestV4): Promise<ToolExecutionResult>;
}

/**
 * In-process registry for real execution adapters.
 *
 * The registry intentionally starts empty. Providers must be registered by
 * server startup code after credentials/configuration have been validated.
 * Persistence, distributed locking, and idempotency storage belong to the
 * durable orchestrator layer, not this process-local registry.
 */
export class ToolAdapterRegistryV4 {
  private readonly adapters = new Map<string, ToolAdapterV4>();

  register(adapter: ToolAdapterV4): void {
    const name = adapter.name.trim();
    if (!name) throw new Error("Tool adapter name must not be empty");
    if (this.adapters.has(name)) {
      throw new Error(`Tool adapter already registered: ${name}`);
    }
    if (adapter.capabilities.length === 0) {
      throw new Error(`Tool adapter ${name} must declare at least one capability`);
    }

    const ids = new Set<string>();
    for (const capability of adapter.capabilities) {
      if (!capability.id.trim()) {
        throw new Error(`Tool adapter ${name} has an empty capability ID`);
      }
      if (ids.has(capability.id)) {
        throw new Error(`Tool adapter ${name} declares duplicate capability: ${capability.id}`);
      }
      ids.add(capability.id);
    }

    this.adapters.set(name, adapter);
  }

  unregister(name: string): boolean {
    return this.adapters.delete(name);
  }

  listCapabilities(options?: { enabledOnly?: boolean; modality?: ToolModality }): Array<{
    adapterName: string;
    capability: ToolCapabilityV4;
  }> {
    const enabledOnly = options?.enabledOnly ?? true;
    const matches: Array<{ adapterName: string; capability: ToolCapabilityV4 }> = [];

    for (const adapter of this.adapters.values()) {
      for (const capability of adapter.capabilities) {
        if (enabledOnly && !capability.enabled) continue;
        if (options?.modality && capability.modality !== options.modality) continue;
        matches.push({ adapterName: adapter.name, capability });
      }
    }
    return matches;
  }

  findAdapterForCapability(capabilityId: string): ToolAdapterV4 | undefined {
    for (const adapter of this.adapters.values()) {
      if (adapter.capabilities.some((capability) => capability.id === capabilityId && capability.enabled)) {
        return adapter;
      }
    }
    return undefined;
  }

  async execute(input: {
    adapterName: string;
    request: ToolExecutionRequestV4;
    budget: ExecutionBudget;
    usage: ExecutionUsage;
  }): Promise<ToolExecutionResult> {
    assertWithinExecutionBudget(input.budget, input.usage, 1);

    const adapter = this.adapters.get(input.adapterName);
    if (!adapter) {
      throw new Error(`Tool adapter is not registered: ${input.adapterName}`);
    }

    const capability = adapter.capabilities.find(
      (item) => item.id === input.request.capabilityId && item.enabled,
    );
    if (!capability) {
      throw new Error(
        `Capability ${input.request.capabilityId} is not enabled on adapter ${input.adapterName}`,
      );
    }

    if (!input.request.idempotencyKey.trim()) {
      throw new Error("Tool execution requires a non-empty idempotencyKey");
    }
    if (!Number.isFinite(input.request.timeoutMs) || input.request.timeoutMs <= 0) {
      throw new Error("Tool execution requires a positive timeoutMs");
    }

    const result = await adapter.execute(input.request);
    assertToolResultIsConsistent(result);

    if (result.status === "RUNNING" && !capability.supportsAsync) {
      throw new Error(
        `Adapter ${adapter.name} returned RUNNING for a capability that does not support async execution`,
      );
    }

    return result;
  }
}

export const toolAdapterRegistryV4 = new ToolAdapterRegistryV4();
