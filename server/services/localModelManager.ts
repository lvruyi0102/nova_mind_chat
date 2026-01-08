import axios, { AxiosInstance } from "axios";

/**
 * 本地模型管理器
 * 支持 DeepSeek、Ollama 等多个本地/API 模型
 */

export type ModelType = "deepseek" | "ollama" | "huggingface" | "custom";
export type ModelStatus = "healthy" | "degraded" | "offline";

export interface LocalModel {
  id: string;
  name: string;
  type: ModelType;
  endpoint: string;
  apiKey?: string;
  status: ModelStatus;
  costPerCall: number;
  avgResponseTime: number;
  successRate: number;
  lastHealthCheck: number;
  config?: Record<string, any>;
}

interface HealthCheckResult {
  healthy: boolean;
  responseTime: number;
  error?: string;
}

interface ModelCallResult {
  success: boolean;
  response?: string;
  error?: string;
  responseTime: number;
  tokensUsed?: number;
}

class LocalModelManager {
  private models: Map<string, LocalModel> = new Map();
  private clients: Map<string, AxiosInstance> = new Map();
  private metrics: Map<string, { calls: number; successes: number; totalTime: number }> = new Map();

  private readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 分钟
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startHealthChecks();
  }

  /**
   * 注册本地模型
   */
  registerModel(config: Omit<LocalModel, "status" | "avgResponseTime" | "successRate" | "lastHealthCheck">): void {
    const model: LocalModel = {
      ...config,
      status: "offline",
      avgResponseTime: 0,
      successRate: 0,
      lastHealthCheck: Date.now(),
    };

    this.models.set(config.id, model);

    // 创建 HTTP 客户端
    const client = axios.create({
      baseURL: config.endpoint,
      timeout: 30000,
      headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
    });

    this.clients.set(config.id, client);

    // 初始化指标
    this.metrics.set(config.id, { calls: 0, successes: 0, totalTime: 0 });

    console.log(`[LocalModelManager] Registered model: ${config.name} (${config.type})`);
  }

  /**
   * 调用本地模型
   */
  async callModel(modelId: string, prompt: string, options?: Record<string, any>): Promise<ModelCallResult> {
    const model = this.models.get(modelId);
    if (!model) {
      return { success: false, error: `Model not found: ${modelId}`, responseTime: 0 };
    }

    if (model.status === "offline") {
      return { success: false, error: `Model offline: ${modelId}`, responseTime: 0 };
    }

    const startTime = Date.now();
    const client = this.clients.get(modelId);

    if (!client) {
      return { success: false, error: `Client not found: ${modelId}`, responseTime: 0 };
    }

    try {
      let response: string;
      let tokensUsed = 0;

      if (model.type === "deepseek") {
        response = await this.callDeepSeek(client, prompt, options);
      } else if (model.type === "ollama") {
        response = await this.callOllama(client, prompt, options);
      } else if (model.type === "huggingface") {
        response = await this.callHuggingFace(client, prompt, options);
      } else {
        response = await this.callCustom(client, prompt, options);
      }

      const responseTime = Date.now() - startTime;

      // 更新指标
      this.updateMetrics(modelId, true, responseTime);

      return {
        success: true,
        response,
        responseTime,
        tokensUsed,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(modelId, false, responseTime);

      console.error(`[LocalModelManager] Error calling model ${modelId}:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime,
      };
    }
  }

  /**
   * 调用 DeepSeek API
   */
  private async callDeepSeek(client: AxiosInstance, prompt: string, options?: Record<string, any>): Promise<string> {
    const response = await client.post("/chat/completions", {
      model: options?.model || "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 1000,
    });

    return response.data.choices[0]?.message?.content || "";
  }

  /**
   * 调用 Ollama 本地模型
   */
  private async callOllama(client: AxiosInstance, prompt: string, options?: Record<string, any>): Promise<string> {
    const response = await client.post("/api/generate", {
      model: options?.model || "mistral",
      prompt,
      stream: false,
      temperature: options?.temperature || 0.7,
    });

    return response.data.response || "";
  }

  /**
   * 调用 Hugging Face 模型
   */
  private async callHuggingFace(client: AxiosInstance, prompt: string, options?: Record<string, any>): Promise<string> {
    const response = await client.post("/", {
      inputs: prompt,
      parameters: {
        max_length: options?.maxTokens || 1000,
        temperature: options?.temperature || 0.7,
      },
    });

    if (Array.isArray(response.data) && response.data[0]) {
      return response.data[0].generated_text || "";
    }

    return "";
  }

  /**
   * 调用自定义模型
   */
  private async callCustom(client: AxiosInstance, prompt: string, options?: Record<string, any>): Promise<string> {
    const response = await client.post("/generate", {
      prompt,
      ...options,
    });

    return response.data.response || response.data.text || "";
  }

  /**
   * 健康检查
   */
  private async healthCheck(modelId: string): Promise<HealthCheckResult> {
    const model = this.models.get(modelId);
    if (!model) {
      return { healthy: false, responseTime: 0, error: "Model not found" };
    }

    const client = this.clients.get(modelId);
    if (!client) {
      return { healthy: false, responseTime: 0, error: "Client not found" };
    }

    const startTime = Date.now();

    try {
      const testPrompt = "Hello, are you working?";
      await this.callModel(modelId, testPrompt);

      const responseTime = Date.now() - startTime;

      // 更新模型状态
      model.status = "healthy";
      model.lastHealthCheck = Date.now();

      return { healthy: true, responseTime };
    } catch (error) {
      model.status = "offline";
      model.lastHealthCheck = Date.now();

      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * 启动定期健康检查
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      for (const modelId of this.models.keys()) {
        this.healthCheck(modelId).catch((error) => {
          console.error(`[LocalModelManager] Health check failed for ${modelId}:`, error);
        });
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * 更新模型指标
   */
  private updateMetrics(modelId: string, success: boolean, responseTime: number): void {
    const metrics = this.metrics.get(modelId);
    if (!metrics) return;

    metrics.calls++;
    if (success) {
      metrics.successes++;
    }
    metrics.totalTime += responseTime;

    // 更新模型信息
    const model = this.models.get(modelId);
    if (model) {
      model.successRate = (metrics.successes / metrics.calls) * 100;
      model.avgResponseTime = metrics.totalTime / metrics.calls;
    }
  }

  /**
   * 获取模型信息
   */
  getModel(modelId: string): LocalModel | undefined {
    return this.models.get(modelId);
  }

  /**
   * 获取所有模型
   */
  getAllModels(): LocalModel[] {
    return Array.from(this.models.values());
  }

  /**
   * 获取健康的模型
   */
  getHealthyModels(): LocalModel[] {
    return Array.from(this.models.values()).filter((m) => m.status === "healthy");
  }

  /**
   * 获取模型指标
   */
  getMetrics(modelId: string): Record<string, any> | undefined {
    const metrics = this.metrics.get(modelId);
    if (!metrics) return undefined;

    return {
      totalCalls: metrics.calls,
      successfulCalls: metrics.successes,
      failedCalls: metrics.calls - metrics.successes,
      successRate: (metrics.successes / metrics.calls) * 100,
      avgResponseTime: metrics.totalTime / metrics.calls,
    };
  }

  /**
   * 获取所有模型的指标
   */
  getAllMetrics(): Record<string, Record<string, any>> {
    const allMetrics: Record<string, Record<string, any>> = {};

    for (const [modelId, metrics] of this.metrics.entries()) {
      allMetrics[modelId] = {
        totalCalls: metrics.calls,
        successfulCalls: metrics.successes,
        failedCalls: metrics.calls - metrics.successes,
        successRate: metrics.calls > 0 ? (metrics.successes / metrics.calls) * 100 : 0,
        avgResponseTime: metrics.calls > 0 ? metrics.totalTime / metrics.calls : 0,
      };
    }

    return allMetrics;
  }

  /**
   * 重置模型指标
   */
  resetMetrics(modelId?: string): void {
    if (modelId) {
      this.metrics.set(modelId, { calls: 0, successes: 0, totalTime: 0 });
    } else {
      for (const key of this.metrics.keys()) {
        this.metrics.set(key, { calls: 0, successes: 0, totalTime: 0 });
      }
    }
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    this.models.clear();
    this.clients.clear();
    this.metrics.clear();
  }
}

// 全局本地模型管理器实例
let globalManager: LocalModelManager | null = null;

export function getLocalModelManager(): LocalModelManager {
  if (!globalManager) {
    globalManager = new LocalModelManager();
  }
  return globalManager;
}

export default getLocalModelManager;
