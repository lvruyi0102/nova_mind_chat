/**
 * 免费模型管理器
 * 管理 Ollama 和 DeepSeek 免费模型
 * 完全免费部署
 */

export interface FreeModelConfig {
  ollamaEnabled: boolean;
  ollamaEndpoint: string;
  ollamaModel: string;
  deepseekEnabled: boolean;
  deepseekApiKey?: string;
  deepseekApiUrl: string;
  strategy: "cost" | "balanced" | "quality";
  enableAutoFallback: boolean;
}

export interface FreeModelResponse {
  response: string;
  modelUsed: string;
  cost: number; // 应该总是 0
  duration: number;
  success: boolean;
  error?: string;
}

class FreeModelManager {
  private config: FreeModelConfig;
  private callCount = 0;
  private dailyCallCount = 0;
  private lastResetDate = new Date().toDateString();

  constructor() {
    this.config = this.loadConfig();
    console.log("[FreeModelManager] Initialized with config:", {
      ollamaEnabled: this.config.ollamaEnabled,
      deepseekEnabled: this.config.deepseekEnabled,
      strategy: this.config.strategy,
    });
  }

  /**
   * 从环境变量加载配置
   */
  private loadConfig(): FreeModelConfig {
    return {
      ollamaEnabled: process.env.OLLAMA_ENABLED === "true",
      ollamaEndpoint: process.env.OLLAMA_ENDPOINT || "http://localhost:11434",
      ollamaModel: process.env.OLLAMA_MODEL || "mistral",
      deepseekEnabled: !!process.env.DEEPSEEK_API_KEY,
      deepseekApiKey: process.env.DEEPSEEK_API_KEY,
      deepseekApiUrl: process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1",
      strategy: (process.env.MODEL_STRATEGY as any) || "cost",
      enableAutoFallback: process.env.ENABLE_AUTO_FALLBACK !== "false",
    };
  }

  /**
   * 调用免费模型
   */
  async callFreeModel(prompt: string): Promise<FreeModelResponse> {
    const startTime = Date.now();

    // 检查每日限制
    this.checkDailyLimit();

    // 根据策略选择模型
    const modelToUse = this.selectModel();

    try {
      let response: string;

      if (modelToUse === "ollama") {
        response = await this.callOllama(prompt);
      } else if (modelToUse === "deepseek") {
        response = await this.callDeepSeek(prompt);
      } else {
        throw new Error("No free model available");
      }

      const duration = Date.now() - startTime;
      this.callCount++;
      this.dailyCallCount++;

      return {
        response,
        modelUsed: modelToUse,
        cost: 0, // 完全免费
        duration,
        success: true,
      };
    } catch (error) {
      console.error("[FreeModelManager] Error calling model:", error);

      // 自动降级
      if (this.config.enableAutoFallback) {
        return await this.fallbackToAlternativeModel(prompt);
      }

      return {
        response: "",
        modelUsed: modelToUse,
        cost: 0,
        duration: Date.now() - startTime,
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * 调用 Ollama 本地模型
   */
  private async callOllama(prompt: string): Promise<string> {
    if (!this.config.ollamaEnabled) {
      throw new Error("Ollama is not enabled");
    }

    try {
      const response = await fetch(`${this.config.ollamaEndpoint}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.ollamaModel,
          prompt: prompt,
          stream: false,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response || "";
    } catch (error) {
      console.error("[FreeModelManager] Ollama error:", error);
      throw error;
    }
  }

  /**
   * 调用 DeepSeek 免费 API
   */
  private async callDeepSeek(prompt: string): Promise<string> {
    if (!this.config.deepseekEnabled || !this.config.deepseekApiKey) {
      throw new Error("DeepSeek is not enabled or API key is missing");
    }

    try {
      const response = await fetch(`${this.config.deepseekApiUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.deepseekApiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } catch (error) {
      console.error("[FreeModelManager] DeepSeek error:", error);
      throw error;
    }
  }

  /**
   * 选择要使用的模型
   */
  private selectModel(): string {
    if (this.config.strategy === "cost") {
      // 优先使用 Ollama（完全免费）
      if (this.config.ollamaEnabled) return "ollama";
      if (this.config.deepseekEnabled) return "deepseek";
    } else if (this.config.strategy === "quality") {
      // 优先使用 DeepSeek（质量更好）
      if (this.config.deepseekEnabled) return "deepseek";
      if (this.config.ollamaEnabled) return "ollama";
    } else {
      // balanced - 轮流使用
      return this.callCount % 2 === 0 ? "ollama" : "deepseek";
    }

    throw new Error("No free model available");
  }

  /**
   * 自动降级到备选模型
   */
  private async fallbackToAlternativeModel(prompt: string): Promise<FreeModelResponse> {
    const startTime = Date.now();

    try {
      // 尝试备选模型
      const currentModel = this.selectModel();
      const alternativeModel = currentModel === "ollama" ? "deepseek" : "ollama";

      let response: string;

      if (alternativeModel === "ollama" && this.config.ollamaEnabled) {
        response = await this.callOllama(prompt);
        return {
          response,
          modelUsed: "ollama_fallback",
          cost: 0,
          duration: Date.now() - startTime,
          success: true,
        };
      } else if (alternativeModel === "deepseek" && this.config.deepseekEnabled) {
        response = await this.callDeepSeek(prompt);
        return {
          response,
          modelUsed: "deepseek_fallback",
          cost: 0,
          duration: Date.now() - startTime,
          success: true,
        };
      }

      throw new Error("All free models failed");
    } catch (error) {
      console.error("[FreeModelManager] Fallback failed:", error);
      return {
        response: "抱歉，暂时无法处理你的请求。请稍后重试。",
        modelUsed: "none",
        cost: 0,
        duration: Date.now() - startTime,
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * 检查每日限制
   */
  private checkDailyLimit(): void {
    const today = new Date().toDateString();

    if (today !== this.lastResetDate) {
      this.dailyCallCount = 0;
      this.lastResetDate = today;
    }

    const dailyLimit = parseInt(process.env.FREE_VERSION_DAILY_LIMIT || "50");

    if (this.dailyCallCount >= dailyLimit) {
      console.warn("[FreeModelManager] Daily limit reached:", dailyLimit);
      throw new Error(`Daily limit reached: ${dailyLimit} calls per day`);
    }
  }

  /**
   * 获取使用统计
   */
  getStats() {
    return {
      totalCalls: this.callCount,
      dailyCallCount: this.dailyCallCount,
      dailyLimit: parseInt(process.env.FREE_VERSION_DAILY_LIMIT || "50"),
      monthlyLimit: parseInt(process.env.FREE_VERSION_MONTHLY_LIMIT || "1000"),
      totalCost: 0, // 完全免费
      strategy: this.config.strategy,
      ollamaEnabled: this.config.ollamaEnabled,
      deepseekEnabled: this.config.deepseekEnabled,
    };
  }

  /**
   * 获取模型状态
   */
  async getModelStatus() {
    const status: Record<string, any> = {
      timestamp: new Date().toISOString(),
      strategy: this.config.strategy,
    };

    // 检查 Ollama 状态
    if (this.config.ollamaEnabled) {
      try {
        const response = await fetch(`${this.config.ollamaEndpoint}/api/tags`);
        status.ollama = {
          available: response.ok,
          endpoint: this.config.ollamaEndpoint,
          model: this.config.ollamaModel,
        };
      } catch (error) {
        status.ollama = {
          available: false,
          error: String(error),
        };
      }
    }

    // 检查 DeepSeek 状态
    if (this.config.deepseekEnabled) {
      status.deepseek = {
        available: true,
        endpoint: this.config.deepseekApiUrl,
        hasApiKey: !!this.config.deepseekApiKey,
      };
    }

    return status;
  }

  /**
   * 生成成本报告
   */
  generateCostReport() {
    return {
      totalCalls: this.callCount,
      totalCost: 0, // 完全免费
      costPerCall: 0,
      estimatedMonthlyCost: 0,
      message: "🎉 完全免费！所有对话都使用开源模型，成本为 0 元。",
    };
  }
}

// 全局实例
let globalFreeModelManager: FreeModelManager | null = null;

export function getFreeModelManager(): FreeModelManager {
  if (!globalFreeModelManager) {
    globalFreeModelManager = new FreeModelManager();
  }
  return globalFreeModelManager;
}

export default getFreeModelManager;
