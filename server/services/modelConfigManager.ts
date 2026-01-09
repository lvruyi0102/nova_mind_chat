/**
 * 模型配置管理器
 * 管理本地模型的配置、初始化和验证
 */

import { getLocalModelManager } from "./localModelManager";

export interface ModelConfig {
  id: string;
  name: string;
  type: "deepseek" | "ollama" | "huggingface" | "custom";
  endpoint: string;
  apiKey?: string;
  costPerCall: number;
  enabled: boolean;
  priority: number;
  config?: Record<string, any>;
}

export interface DeploymentConfig {
  models: ModelConfig[];
  defaultStrategy: "cost" | "quality" | "speed" | "balanced";
  costBudget?: number;
  enableAutoOptimization: boolean;
  enableCostAlerts: boolean;
}

class ModelConfigManager {
  private configs: Map<string, ModelConfig> = new Map();
  private deploymentConfig: DeploymentConfig | null = null;

  /**
   * 从环境变量加载配置
   */
  loadFromEnv(): void {
    // 加载 DeepSeek 配置
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    const deepseekApiUrl = process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1";

    if (deepseekApiKey) {
      this.registerConfig({
        id: "deepseek",
        name: "DeepSeek Chat",
        type: "deepseek",
        endpoint: deepseekApiUrl,
        apiKey: deepseekApiKey,
        costPerCall: 0.003,
        enabled: true,
        priority: 1,
        config: {
          model: "deepseek-chat",
          temperature: 0.7,
          maxTokens: 1000,
        },
      });

      console.log("[ModelConfigManager] DeepSeek model loaded from environment");
    }

    // 加载 Ollama 配置
    const ollamaEndpoint = process.env.OLLAMA_ENDPOINT || "http://localhost:11434";
    const ollamaEnabled = process.env.OLLAMA_ENABLED === "true";

    if (ollamaEnabled) {
      this.registerConfig({
        id: "ollama-mistral",
        name: "Ollama Mistral 7B",
        type: "ollama",
        endpoint: ollamaEndpoint,
        costPerCall: 0,
        enabled: true,
        priority: 2,
        config: {
          model: "mistral",
          temperature: 0.7,
        },
      });

      console.log("[ModelConfigManager] Ollama model loaded from environment");
    }

    // 加载部署配置
    this.deploymentConfig = {
      models: Array.from(this.configs.values()),
      defaultStrategy: (process.env.MODEL_STRATEGY as any) || "balanced",
      costBudget: process.env.MONTHLY_COST_BUDGET ? parseFloat(process.env.MONTHLY_COST_BUDGET) : undefined,
      enableAutoOptimization: process.env.ENABLE_AUTO_OPTIMIZATION !== "false",
      enableCostAlerts: process.env.ENABLE_COST_ALERTS !== "false",
    };

    console.log("[ModelConfigManager] Deployment config loaded:", {
      modelCount: this.configs.size,
      strategy: this.deploymentConfig.defaultStrategy,
      costBudget: this.deploymentConfig.costBudget,
      autoOptimization: this.deploymentConfig.enableAutoOptimization,
    });
  }

  /**
   * 注册模型配置
   */
  registerConfig(config: ModelConfig): void {
    this.configs.set(config.id, config);
    console.log(`[ModelConfigManager] Model registered: ${config.name}`);
  }

  /**
   * 获取配置
   */
  getConfig(modelId: string): ModelConfig | undefined {
    return this.configs.get(modelId);
  }

  /**
   * 获取所有配置
   */
  getAllConfigs(): ModelConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * 获取启用的配置
   */
  getEnabledConfigs(): ModelConfig[] {
    return Array.from(this.configs.values()).filter((c) => c.enabled);
  }

  /**
   * 获取部署配置
   */
  getDeploymentConfig(): DeploymentConfig | null {
    return this.deploymentConfig;
  }

  /**
   * 验证配置
   */
  async validateConfigs(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const config of this.getEnabledConfigs()) {
      // 验证必要字段
      if (!config.id || !config.name || !config.endpoint) {
        errors.push(`Invalid config for model ${config.id}: missing required fields`);
        continue;
      }

      // 验证 API 密钥
      if (config.type === "deepseek" && !config.apiKey) {
        errors.push(`DeepSeek model ${config.id} requires API key`);
      }

      // 验证端点连接
      try {
        const response = await fetch(config.endpoint, {
          method: "HEAD",
          timeout: 5000,
        });

        if (!response.ok && response.status !== 405) {
          errors.push(`Cannot connect to ${config.name} endpoint: ${config.endpoint}`);
        }
      } catch (error) {
        errors.push(
          `Failed to validate ${config.name} endpoint: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 初始化本地模型管理器
   */
  async initializeModels(): Promise<void> {
    const manager = getLocalModelManager();

    for (const config of this.getEnabledConfigs()) {
      try {
        manager.registerModel({
          id: config.id,
          name: config.name,
          type: config.type,
          endpoint: config.endpoint,
          apiKey: config.apiKey,
          costPerCall: config.costPerCall,
          config: config.config,
        });

        console.log(`[ModelConfigManager] Model initialized: ${config.name}`);
      } catch (error) {
        console.error(`[ModelConfigManager] Failed to initialize model ${config.id}:`, error);
      }
    }
  }

  /**
   * 更新模型启用状态
   */
  updateModelStatus(modelId: string, enabled: boolean): void {
    const config = this.configs.get(modelId);
    if (config) {
      config.enabled = enabled;
      console.log(`[ModelConfigManager] Model ${modelId} status updated: ${enabled ? "enabled" : "disabled"}`);
    }
  }

  /**
   * 更新部署策略
   */
  updateStrategy(strategy: "cost" | "quality" | "speed" | "balanced"): void {
    if (this.deploymentConfig) {
      this.deploymentConfig.defaultStrategy = strategy;
      console.log(`[ModelConfigManager] Deployment strategy updated: ${strategy}`);
    }
  }

  /**
   * 生成配置报告
   */
  generateReport(): string {
    let report = "# 模型配置报告\n\n";

    report += "## 已注册的模型\n";
    for (const config of this.getAllConfigs()) {
      report += `\n### ${config.name}\n`;
      report += `- ID: ${config.id}\n`;
      report += `- 类型: ${config.type}\n`;
      report += `- 端点: ${config.endpoint}\n`;
      report += `- 成本: ¥${config.costPerCall}/次\n`;
      report += `- 状态: ${config.enabled ? "启用" : "禁用"}\n`;
      report += `- 优先级: ${config.priority}\n`;
    }

    if (this.deploymentConfig) {
      report += "\n## 部署配置\n";
      report += `- 默认策略: ${this.deploymentConfig.defaultStrategy}\n`;
      report += `- 月度预算: ¥${this.deploymentConfig.costBudget || "无限"}\n`;
      report += `- 自动优化: ${this.deploymentConfig.enableAutoOptimization ? "启用" : "禁用"}\n`;
      report += `- 成本告警: ${this.deploymentConfig.enableCostAlerts ? "启用" : "禁用"}\n`;
    }

    return report;
  }
}

// 全局配置管理器实例
let globalConfigManager: ModelConfigManager | null = null;

export function getModelConfigManager(): ModelConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new ModelConfigManager();
  }
  return globalConfigManager;
}

export default getModelConfigManager;
