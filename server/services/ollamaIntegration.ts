/**
 * Ollama 集成服务
 * 将本地 Ollama 模型集成到 Nova-Mind 应用
 * 完全免费，无需 API Key
 */

interface OllamaConfig {
  apiUrl: string;
  model: string;
  enabled: boolean;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

class OllamaIntegration {
  private _config: OllamaConfig | null = null;

  private stats = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    totalTokens: 0,
    totalDuration: 0,
  };

  /**
   * 延迟初始化配置（确保环境变量已加载）
   */
  private get config(): OllamaConfig {
    if (!this._config) {
      const enabled = process.env.OLLAMA_ENABLED === "true" || process.env.OLLAMA_ENABLED === "1" || true; // 强制启用
      this._config = {
        apiUrl: process.env.OLLAMA_API_URL || "http://localhost:11434",
        model: process.env.OLLAMA_MODEL || "phi",
        enabled: enabled,
      };
      console.log(`[OllamaIntegration] Config initialized:`, {
        apiUrl: this._config.apiUrl,
        model: this._config.model,
        enabled: this._config.enabled,
        rawEnv: {
          OLLAMA_ENABLED: process.env.OLLAMA_ENABLED,
          OLLAMA_API_URL: process.env.OLLAMA_API_URL,
          OLLAMA_MODEL: process.env.OLLAMA_MODEL,
        },
      });
    }
    return this._config;
  }

  /**
   * 检查 Ollama 服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    const cfg = this.config;
    console.log(`[OllamaIntegration] Checking availability, enabled=${cfg.enabled}, apiUrl=${cfg.apiUrl}`);
    
    if (!cfg.enabled) {
      console.log("[OllamaIntegration] Service is disabled via OLLAMA_ENABLED");
      return false;
    }

    try {
      const response = await fetch(`${cfg.apiUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000), // 5 秒超时
      });
      const available = response.ok;
      console.log(`[OllamaIntegration] Service check result: ${available}`);
      return available;
    } catch (error) {
      console.error("[OllamaIntegration] Service check failed:", error);
      return false;
    }
  }

  /**
   * 获取可用模型列表
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      console.error("[OllamaIntegration] Failed to get models:", error);
      return [];
    }
  }

  /**
   * 调用 Ollama 生成文本
   */
  async generate(prompt: string, options?: any): Promise<string> {
    const cfg = this.config;
    
    if (!cfg.enabled) {
      throw new Error("Ollama is not enabled. Set OLLAMA_ENABLED=true in environment.");
    }

    this.stats.totalCalls++;
    console.log(`[OllamaIntegration] Generating response with model: ${cfg.model}`);

    try {
      // 使用 AbortController 设置 120 秒超时（模型加载可能需要较长时间）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      
      const response = await fetch(`${cfg.apiUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: cfg.model,
          prompt,
          stream: false,
          temperature: options?.temperature || 0.7,
          top_p: options?.top_p || 0.9,
          top_k: options?.top_k || 40,
          num_predict: options?.num_predict || 256,
          ...options,
        }),
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: OllamaResponse = await response.json();

      // 更新统计信息
      this.stats.successfulCalls++;
      if (data.eval_count) {
        this.stats.totalTokens += data.eval_count;
      }
      if (data.total_duration) {
        this.stats.totalDuration += data.total_duration;
      }

      console.log(`[OllamaIntegration] Generated response in ${(data.total_duration || 0) / 1e9}s`);
      return data.response.trim();
    } catch (error: any) {
      this.stats.failedCalls++;
      if (error.name === 'AbortError') {
        console.error("[OllamaIntegration] Request timed out after 120s");
        throw new Error("请求超时，请稍后重试");
      }
      console.error("[OllamaIntegration] Generation failed:", error);
      throw error;
    }
  }

  /**
   * 调用 Ollama 进行对话
   */
  async chat(
    messages: Array<{ role: string; content: string }>,
    options?: any
  ): Promise<string> {
    if (!this.config.enabled) {
      throw new Error("Ollama is not enabled. Set OLLAMA_ENABLED=true in environment.");
    }

    // 将消息转换为提示词
    const prompt = this.formatMessagesAsPrompt(messages);

    return this.generate(prompt, options);
  }

  /**
   * 将消息格式化为提示词
   */
  private formatMessagesAsPrompt(
    messages: Array<{ role: string; content: string }>
  ): string {
    return messages
      .map((msg) => {
        const role = msg.role === "user" ? "User" : "Assistant";
        return `${role}: ${msg.content}`;
      })
      .join("\n") + "\nAssistant:";
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      successRate:
        this.stats.totalCalls > 0
          ? ((this.stats.successfulCalls / this.stats.totalCalls) * 100).toFixed(
              2
            )
          : "N/A",
      averageTokens:
        this.stats.successfulCalls > 0
          ? (this.stats.totalTokens / this.stats.successfulCalls).toFixed(2)
          : "N/A",
      averageDuration:
        this.stats.successfulCalls > 0
          ? (this.stats.totalDuration / this.stats.successfulCalls / 1e9).toFixed(
              2
            )
          : "N/A",
    };
  }

  /**
   * 生成报告
   */
  generateReport(): string {
    const stats = this.getStats();
    const cfg = this.config;
    return `
=== Ollama 集成报告 ===

配置:
- API URL: ${cfg.apiUrl}
- 模型: ${cfg.model}
- 启用: ${cfg.enabled}

统计:
- 总调用数: ${stats.totalCalls}
- 成功调用: ${stats.successfulCalls}
- 失败调用: ${stats.failedCalls}
- 成功率: ${stats.successRate}%

性能:
- 总 Token 数: ${stats.totalTokens}
- 平均 Token 数: ${stats.averageTokens}
- 平均响应时间: ${stats.averageDuration}s

成本: 完全免费 (¥0)
    `;
  }

  /**
   * 设置模型
   */
  setModel(model: string): void {
    if (this._config) {
      this._config.model = model;
    }
    console.log(`[OllamaIntegration] Model changed to: ${model}`);
  }

  /**
   * 获取当前配置
   */
  getConfig(): OllamaConfig {
    return { ...this.config };
  }
  
  /**
   * 强制重新加载配置
   */
  reloadConfig(): void {
    this._config = null;
    console.log("[OllamaIntegration] Config will be reloaded on next access");
  }
}

// 单例模式
let instance: OllamaIntegration | null = null;

export function getOllamaIntegration(): OllamaIntegration {
  if (!instance) {
    instance = new OllamaIntegration();
  }
  return instance;
}
