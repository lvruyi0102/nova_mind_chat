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

interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

class OllamaIntegration {
  private _config: OllamaConfig | null = null;

  private get config(): OllamaConfig {
    if (!this._config) {
      this._config = {
        apiUrl: process.env.OLLAMA_API_URL || "http://localhost:11434",
        model: process.env.OLLAMA_MODEL || "phi",
        enabled: true, // 强制启用
      };
    }
    return this._config;
  }

  /**
   * 与 Ollama 聊天
   */
  async chat(messages: OllamaMessage[]): Promise<string> {
    const cfg = this.config;
    
    try {
      const response = await fetch(`${cfg.apiUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: cfg.model,
          messages: messages,
          stream: false,
        }),
        signal: AbortSignal.timeout(180000), // 180 秒超时
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return data.message?.content || "无法生成回复";
    } catch (error) {
      console.error("[OllamaIntegration] Chat error:", error);
      throw error;
    }
  }
}

let instance: OllamaIntegration | null = null;

export function getOllamaIntegration(): OllamaIntegration {
  if (!instance) {
    instance = new OllamaIntegration();
  }
  return instance;
}
