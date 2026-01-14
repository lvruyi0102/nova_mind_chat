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
  private config: OllamaConfig = {
    apiUrl: process.env.OLLAMA_API_URL || "http://localhost:11434",
    model: process.env.OLLAMA_MODEL || "phi",
    enabled: process.env.OLLAMA_ENABLED === "true",
  };

  private stats = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    totalTokens: 0,
    totalDuration: 0,
  };

  /**
   * 检查 Ollama 服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/api/tags`);
      return response.ok;
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
    if (!this.config.enabled) {
      throw new Error("Ollama is not enabled");
    }

    this.stats.totalCalls++;

    try {
      const response = await fetch(`${this.config.apiUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.model,
          prompt,
          stream: false,
          temperature: options?.temperature || 0.7,
          top_p: options?.top_p || 0.9,
          top_k: options?.top_k || 40,
          num_predict: options?.num_predict || 256,
          ...options,
        }),
      });

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

      return data.response.trim();
    } catch (error) {
      this.stats.failedCalls++;
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
      throw new Error("Ollama is not enabled");
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
    return `
=== Ollama 集成报告 ===

配置:
- API URL: ${this.config.apiUrl}
- 模型: ${this.config.model}
- 启用: ${this.config.enabled}

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
    this.config.model = model;
    console.log(`[OllamaIntegration] Model changed to: ${model}`);
  }

  /**
   * 获取当前配置
   */
  getConfig(): OllamaConfig {
    return { ...this.config };
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
