#!/usr/bin/env node

/**
 * 模型初始化脚本
 * 在服务器启动时初始化本地模型和成本管理系统
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("[InitializeModels] Starting model initialization...\n");

// 检查环境变量
const requiredEnvs = ["DATABASE_URL", "JWT_SECRET"];
const missingEnvs = requiredEnvs.filter((env) => !process.env[env]);

if (missingEnvs.length > 0) {
  console.error("[InitializeModels] Missing required environment variables:", missingEnvs);
  process.exit(1);
}

// 检查可选的 DeepSeek 配置
if (process.env.DEEPSEEK_API_KEY) {
  console.log("[InitializeModels] ✅ DeepSeek API key found");
  console.log(`[InitializeModels]    Endpoint: ${process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1"}`);
} else {
  console.log("[InitializeModels] ⚠️  DeepSeek API key not found");
  console.log("[InitializeModels]    To enable DeepSeek, set DEEPSEEK_API_KEY environment variable");
}

// 检查 Ollama 配置
if (process.env.OLLAMA_ENABLED === "true") {
  console.log("[InitializeModels] ✅ Ollama enabled");
  console.log(`[InitializeModels]    Endpoint: ${process.env.OLLAMA_ENDPOINT || "http://localhost:11434"}`);
} else {
  console.log("[InitializeModels] ⚠️  Ollama disabled");
  console.log("[InitializeModels]    To enable Ollama, set OLLAMA_ENABLED=true");
}

// 检查成本预算配置
const monthlyBudget = process.env.MONTHLY_COST_BUDGET || "100";
const alertThreshold = process.env.ALERT_THRESHOLD || "80";
const criticalThreshold = process.env.CRITICAL_THRESHOLD || "95";

console.log("\n[InitializeModels] Cost Budget Configuration:");
console.log(`[InitializeModels]    Monthly Budget: ¥${monthlyBudget}`);
console.log(`[InitializeModels]    Alert Threshold: ${alertThreshold}%`);
console.log(`[InitializeModels]    Critical Threshold: ${criticalThreshold}%`);

// 检查优化策略配置
const modelStrategy = process.env.MODEL_STRATEGY || "balanced";
const enableAutoOptimization = process.env.ENABLE_AUTO_OPTIMIZATION !== "false";
const enableCostAlerts = process.env.ENABLE_COST_ALERTS !== "false";

console.log("\n[InitializeModels] Optimization Configuration:");
console.log(`[InitializeModels]    Default Strategy: ${modelStrategy}`);
console.log(`[InitializeModels]    Auto Optimization: ${enableAutoOptimization ? "enabled" : "disabled"}`);
console.log(`[InitializeModels]    Cost Alerts: ${enableCostAlerts ? "enabled" : "disabled"}`);

// 生成配置建议
console.log("\n[InitializeModels] Configuration Recommendations:");

if (!process.env.DEEPSEEK_API_KEY && process.env.OLLAMA_ENABLED !== "true") {
  console.log("[InitializeModels] ⚠️  No local models configured!");
  console.log("[InitializeModels]    - To use DeepSeek: export DEEPSEEK_API_KEY=sk-xxx");
  console.log("[InitializeModels]    - To use Ollama: export OLLAMA_ENABLED=true");
  console.log("[InitializeModels]    Without local models, all LLM calls will use Manus LLM");
}

if (parseFloat(monthlyBudget) < 50) {
  console.log("[InitializeModels] ⚠️  Monthly budget is very low (< ¥50)");
  console.log("[InitializeModels]    Consider increasing MONTHLY_COST_BUDGET");
}

if (parseInt(alertThreshold) < 70) {
  console.log("[InitializeModels] ⚠️  Alert threshold is very low (< 70%)");
  console.log("[InitializeModels]    You will receive alerts frequently");
}

// 生成环境变量模板
console.log("\n[InitializeModels] Environment Variables Template:");
console.log(`
# DeepSeek Configuration
export DEEPSEEK_API_KEY=sk-your-api-key-here
export DEEPSEEK_API_URL=https://api.deepseek.com/v1

# Ollama Configuration
export OLLAMA_ENABLED=true
export OLLAMA_ENDPOINT=http://localhost:11434

# Cost Budget Configuration
export MONTHLY_COST_BUDGET=100
export ALERT_THRESHOLD=80
export CRITICAL_THRESHOLD=95

# Optimization Configuration
export MODEL_STRATEGY=balanced
export ENABLE_AUTO_OPTIMIZATION=true
export ENABLE_COST_ALERTS=true
`);

console.log("[InitializeModels] ✅ Model initialization completed!");
console.log("[InitializeModels] The server will load these configurations on startup.\n");
