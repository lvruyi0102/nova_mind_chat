import { router, protectedProcedure } from "../_core/trpc";
import { getLocalModelManager } from "../services/localModelManager";
import { getTaskComplexityAnalyzer } from "../services/taskComplexityAnalyzer";
import { getModelSelectionStrategy } from "../services/modelSelectionStrategy";
import { getHybridLLMOptimizer } from "../services/hybridLLMOptimizer";
import { z } from "zod";

export const localModelsRouter = router({
  /**
   * 获取所有本地模型
   */
  getAllModels: protectedProcedure.query(() => {
    const manager = getLocalModelManager();
    return manager.getAllModels();
  }),

  /**
   * 获取健康的本地模型
   */
  getHealthyModels: protectedProcedure.query(() => {
    const manager = getLocalModelManager();
    return manager.getHealthyModels();
  }),

  /**
   * 获取模型详细信息
   */
  getModelDetails: protectedProcedure
    .input(z.object({ modelId: z.string() }))
    .query(({ input }) => {
      const manager = getLocalModelManager();
      const model = manager.getModel(input.modelId);
      const metrics = manager.getMetrics(input.modelId);

      return {
        model,
        metrics,
      };
    }),

  /**
   * 获取所有模型指标
   */
  getAllMetrics: protectedProcedure.query(() => {
    const manager = getLocalModelManager();
    return manager.getAllMetrics();
  }),

  /**
   * 分析任务复杂度
   */
  analyzeComplexity: protectedProcedure
    .input(z.object({ prompt: z.string(), context: z.array(z.string()).optional() }))
    .query(({ input }) => {
      const analyzer = getTaskComplexityAnalyzer();
      return analyzer.analyze(input.prompt, input.context);
    }),

  /**
   * 批量分析复杂度
   */
  analyzeComplexityBatch: protectedProcedure
    .input(z.object({ prompts: z.array(z.string()) }))
    .query(({ input }) => {
      const analyzer = getTaskComplexityAnalyzer();
      const complexities = analyzer.analyzeBatch(input.prompts);
      const stats = analyzer.getStatistics(complexities);

      return {
        complexities,
        statistics: stats,
      };
    }),

  /**
   * 获取模型推荐
   */
  getModelRecommendations: protectedProcedure.query(() => {
    const manager = getLocalModelManager();
    const strategy = getModelSelectionStrategy();
    const availableModels = manager.getAllModels();

    return strategy.getRecommendations(availableModels);
  }),

  /**
   * 混合调用 LLM
   */
  hybridCall: protectedProcedure
    .input(
      z.object({
        prompt: z.string(),
        useLocalModels: z.boolean().optional(),
        prioritize: z.enum(["cost", "quality", "speed", "balanced"]).optional(),
        fallbackToManus: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const optimizer = getHybridLLMOptimizer();

      return await optimizer.hybridCall(input.prompt, {
        useLocalModels: input.useLocalModels,
        prioritize: input.prioritize,
        fallbackToManus: input.fallbackToManus,
      });
    }),

  /**
   * 批量混合调用
   */
  batchHybridCall: protectedProcedure
    .input(
      z.object({
        prompts: z.array(z.string()),
        useLocalModels: z.boolean().optional(),
        prioritize: z.enum(["cost", "quality", "speed", "balanced"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const optimizer = getHybridLLMOptimizer();

      return await optimizer.batchHybridCall(input.prompts, {
        useLocalModels: input.useLocalModels,
        prioritize: input.prioritize,
      });
    }),

  /**
   * 获取模型使用统计
   */
  getModelUsageStats: protectedProcedure.query(() => {
    const optimizer = getHybridLLMOptimizer();
    return optimizer.getModelUsageStats();
  }),

  /**
   * 获取成本节省统计
   */
  getCostSavingsStats: protectedProcedure.query(() => {
    const optimizer = getHybridLLMOptimizer();
    return optimizer.getCostSavingsStats();
  }),

  /**
   * 获取复杂度分布
   */
  getComplexityDistribution: protectedProcedure.query(() => {
    const optimizer = getHybridLLMOptimizer();
    return optimizer.getComplexityDistribution();
  }),

  /**
   * 生成混合优化报告
   */
  generateReport: protectedProcedure.query(() => {
    const optimizer = getHybridLLMOptimizer();

    return {
      report: optimizer.generateReport(),
      timestamp: new Date().toISOString(),
    };
  }),

  /**
   * 重置统计数据（仅管理员）
   */
  resetStats: protectedProcedure.mutation(({ ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new Error("Only admins can reset statistics");
    }

    const optimizer = getHybridLLMOptimizer();
    optimizer.reset();

    return { success: true, message: "Statistics reset successfully" };
  }),

  /**
   * 注册本地模型（仅管理员）
   */
  registerModel: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum(["deepseek", "ollama", "huggingface", "custom"]),
        endpoint: z.string(),
        apiKey: z.string().optional(),
        costPerCall: z.number(),
        config: z.record(z.any()).optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Only admins can register models");
      }

      const manager = getLocalModelManager();

      manager.registerModel({
        id: input.id,
        name: input.name,
        type: input.type,
        endpoint: input.endpoint,
        apiKey: input.apiKey,
        costPerCall: input.costPerCall,
        config: input.config,
      });

      return { success: true, message: `Model ${input.name} registered successfully` };
    }),

  /**
   * 重置模型指标（仅管理员）
   */
  resetModelMetrics: protectedProcedure
    .input(z.object({ modelId: z.string().optional() }))
    .mutation(({ ctx, input }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Only admins can reset metrics");
      }

      const manager = getLocalModelManager();
      manager.resetMetrics(input.modelId);

      return { success: true, message: "Metrics reset successfully" };
    }),
});
