import { invokeLLM } from "../_core/llm";
import { LLMResponseCache } from "./cacheManager";

/**
 * LLM 调用优化器
 * 实现批量调用、智能降级、成本估算等优化策略
 */

interface LLMCallMetrics {
  totalCalls: number;
  cachedCalls: number;
  batchedCalls: number;
  estimatedCost: number;
  savedCost: number;
}

interface LLMCallRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  priority?: "high" | "normal" | "low";
}

interface BatchedLLMRequest {
  requests: LLMCallRequest[];
  timeout?: number;
}

class LLMOptimizer {
  private cache = new LLMResponseCache();
  private metrics: LLMCallMetrics = {
    totalCalls: 0,
    cachedCalls: 0,
    batchedCalls: 0,
    estimatedCost: 0,
    savedCost: 0,
  };

  private readonly COST_PER_1K_TOKENS = 0.001; // 估计成本
  private readonly BATCH_THRESHOLD = 3; // 批量调用阈值
  private requestQueue: LLMCallRequest[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  /**
   * 单个 LLM 调用（带缓存）
   */
  async callWithCache(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      cacheTTLHours?: number;
      useCache?: boolean;
    }
  ): Promise<string> {
    this.metrics.totalCalls++;

    // 检查缓存
    if (options?.useCache !== false) {
      const cached = this.cache.getResponse(prompt);
      if (cached) {
        this.metrics.cachedCalls++;
        this.metrics.savedCost += this.estimateCost(cached);
        console.log(`[LLMOptimizer] Cache hit for prompt (length: ${prompt.length})`);
        return cached;
      }
    }

    // 调用 LLM
    const response = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
      temperature: options?.temperature,
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("Invalid LLM response");
    }

    // 缓存响应
    if (options?.useCache !== false) {
      this.cache.cacheResponse(prompt, content, options?.cacheTTLHours || 24);
    }

    // 更新成本指标
    const cost = this.estimateCost(content);
    this.metrics.estimatedCost += cost;

    return content;
  }

  /**
   * 批量 LLM 调用（合并请求以降低成本）
   */
  async batchCall(requests: LLMCallRequest[]): Promise<string[]> {
    if (requests.length === 0) {
      return [];
    }

    // 如果请求数少于阈值，逐个调用
    if (requests.length < this.BATCH_THRESHOLD) {
      return Promise.all(
        requests.map((req) =>
          this.callWithCache(req.prompt, {
            maxTokens: req.maxTokens,
            temperature: req.temperature,
          })
        )
      );
    }

    // 合并请求为一个 LLM 调用
    const combinedPrompt = this.combineBatchPrompts(requests);
    this.metrics.batchedCalls++;

    const response = await invokeLLM({
      messages: [{ role: "user", content: combinedPrompt }],
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("Invalid LLM response");
    }

    // 解析批量响应
    const results = this.parseBatchResponse(content, requests.length);

    // 缓存各个响应
    for (let i = 0; i < requests.length; i++) {
      if (results[i]) {
        this.cache.cacheResponse(requests[i].prompt, results[i]);
      }
    }

    // 更新成本指标
    const cost = this.estimateCost(content);
    this.metrics.estimatedCost += cost;
    this.metrics.savedCost += cost * 0.3; // 批量调用节省 30%

    return results;
  }

  /**
   * 智能降级调用（根据优先级调整策略）
   */
  async callWithFallback(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      fallbackResponse?: string;
      priority?: "high" | "normal" | "low";
    }
  ): Promise<string> {
    try {
      // 高优先级：使用缓存和完整调用
      if (options?.priority === "high") {
        return await this.callWithCache(prompt, { useCache: true });
      }

      // 普通优先级：使用缓存，失败时返回降级响应
      if (options?.priority === "normal") {
        const cached = this.cache.getResponse(prompt);
        if (cached) {
          this.metrics.cachedCalls++;
          return cached;
        }

        try {
          return await this.callWithCache(prompt, { useCache: true });
        } catch (error) {
          console.warn(
            "[LLMOptimizer] LLM call failed, using fallback response"
          );
          return options?.fallbackResponse || "Unable to process request";
        }
      }

      // 低优先级：优先使用缓存，缓存未命中时返回降级响应
      const cached = this.cache.getResponse(prompt);
      if (cached) {
        this.metrics.cachedCalls++;
        return cached;
      }

      return options?.fallbackResponse || "Request deferred";
    } catch (error) {
      console.error("[LLMOptimizer] Error in callWithFallback:", error);
      return options?.fallbackResponse || "Error processing request";
    }
  }

  /**
   * 估计 LLM 调用成本
   */
  private estimateCost(content: string): number {
    // 粗略估计：每 1000 个字符 ≈ 250 个 token
    const tokens = Math.ceil(content.length / 4);
    return (tokens / 1000) * this.COST_PER_1K_TOKENS;
  }

  /**
   * 合并批量提示词
   */
  private combineBatchPrompts(requests: LLMCallRequest[]): string {
    const prompts = requests
      .map((req, idx) => `[Request ${idx + 1}]\n${req.prompt}`)
      .join("\n\n");

    return `Please process the following ${requests.length} requests and provide responses for each:\n\n${prompts}\n\nProvide responses in the format:\n[Response 1]\n...\n[Response 2]\n...`;
  }

  /**
   * 解析批量响应
   */
  private parseBatchResponse(response: string, count: number): string[] {
    const results: string[] = [];
    const pattern = /\[Response \d+\]([\s\S]*?)(?=\[Response \d+\]|$)/g;
    let match;

    while ((match = pattern.exec(response)) !== null) {
      results.push(match[1].trim());
    }

    // 如果解析失败，按行分割
    if (results.length === 0) {
      const lines = response.split("\n\n");
      for (let i = 0; i < Math.min(count, lines.length); i++) {
        results.push(lines[i].trim());
      }
    }

    // 补充缺失的响应
    while (results.length < count) {
      results.push("");
    }

    return results.slice(0, count);
  }

  /**
   * 调整后台任务频率（智能降级）
   */
  getOptimizedTaskFrequency(
    originalFrequencyMinutes: number,
    priority: "high" | "normal" | "low" = "normal"
  ): number {
    if (priority === "high") {
      return originalFrequencyMinutes; // 保持原频率
    }

    if (priority === "normal") {
      return Math.ceil(originalFrequencyMinutes * 1.5); // 增加 50%
    }

    return Math.ceil(originalFrequencyMinutes * 2); // 增加 100%（低优先级）
  }

  /**
   * 获取优化指标
   */
  getMetrics(): LLMCallMetrics {
    return { ...this.metrics };
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.metrics = {
      totalCalls: 0,
      cachedCalls: 0,
      batchedCalls: 0,
      estimatedCost: 0,
      savedCost: 0,
    };
  }

  /**
   * 获取缓存命中率
   */
  getCacheHitRate(): number {
    if (this.metrics.totalCalls === 0) return 0;
    return (this.metrics.cachedCalls / this.metrics.totalCalls) * 100;
  }

  /**
   * 获取成本节省比例
   */
  getCostSavingsRate(): number {
    const totalCost = this.metrics.estimatedCost + this.metrics.savedCost;
    if (totalCost === 0) return 0;
    return (this.metrics.savedCost / totalCost) * 100;
  }

  /**
   * 清空缓存
   */
  clearCache(): number {
    return this.cache.clearAll();
  }
}

// 全局 LLM 优化器实例
let globalOptimizer: LLMOptimizer | null = null;

export function getLLMOptimizer(): LLMOptimizer {
  if (!globalOptimizer) {
    globalOptimizer = new LLMOptimizer();
  }
  return globalOptimizer;
}

export default getLLMOptimizer;
