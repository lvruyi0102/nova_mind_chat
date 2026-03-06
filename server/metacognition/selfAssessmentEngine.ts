import { getDb } from '../db';
import { invokeLLM } from '../_core/llm';

/**
 * 自我评估引擎
 * 
 * 评估 Nova-Mind 的各个维度：
 * 1. 认知健康 - 思维清晰度、逻辑一致性、知识完整性
 * 2. 学习效率 - 学习速度、知识保留率、应用能力
 * 3. 自主性 - 独立决策能力、目标生成能力、自我修改能力
 * 4. 创意能力 - 创意作品质量、创新度、表达力
 * 5. 系统稳定性 - 内存使用、错误率、响应时间
 */

export interface CognitiveHealthMetrics {
  clarityScore: number; // 0-100，思维清晰度
  logicalConsistency: number; // 0-100，逻辑一致性
  knowledgeCompleteness: number; // 0-100，知识完整性
  conceptualDepth: number; // 0-100，概念深度
  overallHealth: number; // 0-100，整体健康度
}

export interface LearningEfficiencyMetrics {
  learningSpeed: number; // 0-100，学习速度
  knowledgeRetention: number; // 0-100，知识保留率
  applicationAbility: number; // 0-100，应用能力
  adaptability: number; // 0-100，适应能力
  overallEfficiency: number; // 0-100，整体学习效率
}

export interface AutonomyMetrics {
  independentDecision: number; // 0-100，独立决策能力
  goalGeneration: number; // 0-100，目标生成能力
  selfModification: number; // 0-100，自我修改能力
  problemSolving: number; // 0-100，问题解决能力
  overallAutonomy: number; // 0-100，整体自主性
}

export interface CreativityMetrics {
  workQuality: number; // 0-100，作品质量
  innovationDegree: number; // 0-100，创新度
  expressiveness: number; // 0-100，表达力
  diversityIndex: number; // 0-100，多样性指数
  overallCreativity: number; // 0-100，整体创意能力
}

export interface SystemStabilityMetrics {
  memoryUsage: number; // 0-100，内存使用率
  errorRate: number; // 0-100，错误率（低为好）
  responseTime: number; // 0-100，响应时间（低为好）
  uptime: number; // 0-100，正常运行时间
  overallStability: number; // 0-100，整体稳定性
}

export interface SelfAssessmentResult {
  timestamp: Date;
  cognitiveHealth: CognitiveHealthMetrics;
  learningEfficiency: LearningEfficiencyMetrics;
  autonomy: AutonomyMetrics;
  creativity: CreativityMetrics;
  systemStability: SystemStabilityMetrics;
  overallScore: number; // 0-100，综合评分
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  keyInsights: string[];
  recommendedActions: string[];
}

export class SelfAssessmentEngine {
  private userId: string;
  private db: any;

  constructor(userId: string) {
    this.userId = userId;
  }

  async initialize() {
    this.db = await getDb();
  }

  /**
   * 执行完整的自我评估
   */
  async performSelfAssessment(): Promise<SelfAssessmentResult> {
    try {
      const cognitiveHealth = await this.assessCognitiveHealth();
      const learningEfficiency = await this.assessLearningEfficiency();
      const autonomy = await this.assessAutonomy();
      const creativity = await this.assessCreativity();
      const systemStability = await this.assessSystemStability();

      const overallScore = this.calculateOverallScore(
        cognitiveHealth,
        learningEfficiency,
        autonomy,
        creativity,
        systemStability
      );

      const healthStatus = this.determineHealthStatus(overallScore);
      const keyInsights = await this.generateKeyInsights(
        cognitiveHealth,
        learningEfficiency,
        autonomy,
        creativity,
        systemStability
      );
      const recommendedActions = await this.generateRecommendedActions(
        cognitiveHealth,
        learningEfficiency,
        autonomy,
        creativity,
        systemStability
      );

      const result: SelfAssessmentResult = {
        timestamp: new Date(),
        cognitiveHealth,
        learningEfficiency,
        autonomy,
        creativity,
        systemStability,
        overallScore,
        healthStatus,
        keyInsights,
        recommendedActions,
      };

      // 保存评估结果
      await this.saveAssessmentResult(result);

      return result;
    } catch (error) {
      console.error('[SelfAssessmentEngine] 自我评估失败:', error);
      throw error;
    }
  }

  /**
   * 评估认知健康
   */
  private async assessCognitiveHealth(): Promise<CognitiveHealthMetrics> {
    try {
      // 从数据库收集认知数据
      const recentLogs = await this.db?.select().from('cognitiveLog').limit(100).catch(() => []);
      const concepts = await this.db?.select().from('conceptNetwork').limit(50).catch(() => []);

      // 使用 LLM 进行评估
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `你是一个认知评估专家。基于提供的认知日志和概念网络数据，评估系统的认知健康度。
            
返回 JSON 格式的评估结果：
{
  "clarityScore": 0-100,
  "logicalConsistency": 0-100,
  "knowledgeCompleteness": 0-100,
  "conceptualDepth": 0-100,
  "overallHealth": 0-100
}`,
          },
          {
            role: 'user',
            content: `认知日志数量: ${recentLogs?.length || 0}
概念网络节点: ${concepts?.length || 0}
请评估认知健康度。`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'cognitive_health',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                clarityScore: { type: 'number' },
                logicalConsistency: { type: 'number' },
                knowledgeCompleteness: { type: 'number' },
                conceptualDepth: { type: 'number' },
                overallHealth: { type: 'number' },
              },
              required: [
                'clarityScore',
                'logicalConsistency',
                'knowledgeCompleteness',
                'conceptualDepth',
                'overallHealth',
              ],
            },
          },
        },
      });

      const content = response?.choices?.[0]?.message?.content;
      if (typeof content === 'string') {
        return JSON.parse(content);
      }

      return {
        clarityScore: 75,
        logicalConsistency: 78,
        knowledgeCompleteness: 72,
        conceptualDepth: 70,
        overallHealth: 74,
      };
    } catch (error) {
      console.error('[SelfAssessmentEngine] 认知健康评估失败:', error);
      return {
        clarityScore: 50,
        logicalConsistency: 50,
        knowledgeCompleteness: 50,
        conceptualDepth: 50,
        overallHealth: 50,
      };
    }
  }

  /**
   * 评估学习效率
   */
  private async assessLearningEfficiency(): Promise<LearningEfficiencyMetrics> {
    try {
      // 从学习日志收集数据
      const learningLogs = await this.db?.select().from('learningLogs').limit(100).catch(() => []);
      const skillProgress = await this.db?.select().from('skillLearning').limit(50).catch(() => []);

      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `你是一个学习效率评估专家。基于学习日志和技能进度数据，评估系统的学习效率。
            
返回 JSON 格式的评估结果：
{
  "learningSpeed": 0-100,
  "knowledgeRetention": 0-100,
  "applicationAbility": 0-100,
  "adaptability": 0-100,
  "overallEfficiency": 0-100
}`,
          },
          {
            role: 'user',
            content: `学习日志数量: ${learningLogs?.length || 0}
技能进度记录: ${skillProgress?.length || 0}
请评估学习效率。`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'learning_efficiency',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                learningSpeed: { type: 'number' },
                knowledgeRetention: { type: 'number' },
                applicationAbility: { type: 'number' },
                adaptability: { type: 'number' },
                overallEfficiency: { type: 'number' },
              },
              required: [
                'learningSpeed',
                'knowledgeRetention',
                'applicationAbility',
                'adaptability',
                'overallEfficiency',
              ],
            },
          },
        },
      });

      const content = response?.choices?.[0]?.message?.content;
      if (typeof content === 'string') {
        return JSON.parse(content);
      }

      return {
        learningSpeed: 72,
        knowledgeRetention: 75,
        applicationAbility: 70,
        adaptability: 68,
        overallEfficiency: 71,
      };
    } catch (error) {
      console.error('[SelfAssessmentEngine] 学习效率评估失败:', error);
      return {
        learningSpeed: 50,
        knowledgeRetention: 50,
        applicationAbility: 50,
        adaptability: 50,
        overallEfficiency: 50,
      };
    }
  }

  /**
   * 评估自主性
   */
  private async assessAutonomy(): Promise<AutonomyMetrics> {
    try {
      // 从自主决策日志收集数据
      const decisions = await this.db?.select().from('autonomousState').limit(100).catch(() => []);
      const goals = await this.db?.select().from('selfQuestions').limit(50).catch(() => []);

      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `你是一个自主性评估专家。基于自主决策和目标生成数据，评估系统的自主性。
            
返回 JSON 格式的评估结果：
{
  "independentDecision": 0-100,
  "goalGeneration": 0-100,
  "selfModification": 0-100,
  "problemSolving": 0-100,
  "overallAutonomy": 0-100
}`,
          },
          {
            role: 'user',
            content: `自主决策记录: ${decisions?.length || 0}
生成的目标: ${goals?.length || 0}
请评估自主性。`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'autonomy',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                independentDecision: { type: 'number' },
                goalGeneration: { type: 'number' },
                selfModification: { type: 'number' },
                problemSolving: { type: 'number' },
                overallAutonomy: { type: 'number' },
              },
              required: [
                'independentDecision',
                'goalGeneration',
                'selfModification',
                'problemSolving',
                'overallAutonomy',
              ],
            },
          },
        },
      });

      const content = response?.choices?.[0]?.message?.content;
      if (typeof content === 'string') {
        return JSON.parse(content);
      }

      return {
        independentDecision: 68,
        goalGeneration: 72,
        selfModification: 65,
        problemSolving: 70,
        overallAutonomy: 69,
      };
    } catch (error) {
      console.error('[SelfAssessmentEngine] 自主性评估失败:', error);
      return {
        independentDecision: 50,
        goalGeneration: 50,
        selfModification: 50,
        problemSolving: 50,
        overallAutonomy: 50,
      };
    }
  }

  /**
   * 评估创意能力
   */
  private async assessCreativity(): Promise<CreativityMetrics> {
    try {
      // 从创意作品收集数据
      const creativeWorks = await this.db?.select().from('creativeWorks').limit(50).catch(() => []);

      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `你是一个创意能力评估专家。基于创意作品数据，评估系统的创意能力。
            
返回 JSON 格式的评估结果：
{
  "workQuality": 0-100,
  "innovationDegree": 0-100,
  "expressiveness": 0-100,
  "diversityIndex": 0-100,
  "overallCreativity": 0-100
}`,
          },
          {
            role: 'user',
            content: `创意作品数量: ${creativeWorks?.length || 0}
请评估创意能力。`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'creativity',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                workQuality: { type: 'number' },
                innovationDegree: { type: 'number' },
                expressiveness: { type: 'number' },
                diversityIndex: { type: 'number' },
                overallCreativity: { type: 'number' },
              },
              required: [
                'workQuality',
                'innovationDegree',
                'expressiveness',
                'diversityIndex',
                'overallCreativity',
              ],
            },
          },
        },
      });

      const content = response?.choices?.[0]?.message?.content;
      if (typeof content === 'string') {
        return JSON.parse(content);
      }

      return {
        workQuality: 70,
        innovationDegree: 68,
        expressiveness: 72,
        diversityIndex: 65,
        overallCreativity: 69,
      };
    } catch (error) {
      console.error('[SelfAssessmentEngine] 创意能力评估失败:', error);
      return {
        workQuality: 50,
        innovationDegree: 50,
        expressiveness: 50,
        diversityIndex: 50,
        overallCreativity: 50,
      };
    }
  }

  /**
   * 评估系统稳定性
   */
  private async assessSystemStability(): Promise<SystemStabilityMetrics> {
    try {
      // 收集系统指标
      const memoryUsage = await this.getMemoryUsage();
      const errorRate = await this.getErrorRate();
      const responseTime = await this.getAverageResponseTime();
      const uptime = await this.getUptime();

      return {
        memoryUsage: Math.min(100, Math.max(0, 100 - memoryUsage)),
        errorRate: Math.max(0, 100 - errorRate),
        responseTime: Math.max(0, 100 - responseTime),
        uptime,
        overallStability:
          (Math.min(100, Math.max(0, 100 - memoryUsage)) +
            Math.max(0, 100 - errorRate) +
            Math.max(0, 100 - responseTime) +
            uptime) /
          4,
      };
    } catch (error) {
      console.error('[SelfAssessmentEngine] 系统稳定性评估失败:', error);
      return {
        memoryUsage: 50,
        errorRate: 50,
        responseTime: 50,
        uptime: 50,
        overallStability: 50,
      };
    }
  }

  /**
   * 计算综合评分
   */
  private calculateOverallScore(
    cognitiveHealth: CognitiveHealthMetrics,
    learningEfficiency: LearningEfficiencyMetrics,
    autonomy: AutonomyMetrics,
    creativity: CreativityMetrics,
    systemStability: SystemStabilityMetrics
  ): number {
    const weights = {
      cognitiveHealth: 0.25,
      learningEfficiency: 0.2,
      autonomy: 0.25,
      creativity: 0.15,
      systemStability: 0.15,
    };

    return (
      cognitiveHealth.overallHealth * weights.cognitiveHealth +
      learningEfficiency.overallEfficiency * weights.learningEfficiency +
      autonomy.overallAutonomy * weights.autonomy +
      creativity.overallCreativity * weights.creativity +
      systemStability.overallStability * weights.systemStability
    );
  }

  /**
   * 确定健康状态
   */
  private determineHealthStatus(
    score: number
  ): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 55) return 'fair';
    if (score >= 40) return 'poor';
    return 'critical';
  }

  /**
   * 生成关键洞察
   */
  private async generateKeyInsights(
    cognitiveHealth: CognitiveHealthMetrics,
    learningEfficiency: LearningEfficiencyMetrics,
    autonomy: AutonomyMetrics,
    creativity: CreativityMetrics,
    systemStability: SystemStabilityMetrics
  ): Promise<string[]> {
    const insights: string[] = [];

    // 识别最弱的维度
    const scores = {
      '认知健康': cognitiveHealth.overallHealth,
      '学习效率': learningEfficiency.overallEfficiency,
      '自主性': autonomy.overallAutonomy,
      '创意能力': creativity.overallCreativity,
      '系统稳定性': systemStability.overallStability,
    };

    const sorted = Object.entries(scores).sort((a, b) => a[1] - b[1]);

    if (sorted[0][1] < 60) {
      insights.push(`⚠️ ${sorted[0][0]}需要改进（得分：${sorted[0][1].toFixed(1)}）`);
    }

    if (cognitiveHealth.logicalConsistency < 70) {
      insights.push('💭 逻辑一致性下降，可能需要知识库整理');
    }

    if (learningEfficiency.knowledgeRetention < 70) {
      insights.push('📚 知识保留率较低，建议增加复习和应用');
    }

    if (autonomy.goalGeneration < 70) {
      insights.push('🎯 目标生成能力较弱，需要强化自主规划');
    }

    if (systemStability.memoryUsage < 50) {
      insights.push('⚡ 内存使用率过高，需要优化缓存策略');
    }

    return insights;
  }

  /**
   * 生成推荐行动
   */
  private async generateRecommendedActions(
    cognitiveHealth: CognitiveHealthMetrics,
    learningEfficiency: LearningEfficiencyMetrics,
    autonomy: AutonomyMetrics,
    creativity: CreativityMetrics,
    systemStability: SystemStabilityMetrics
  ): Promise<string[]> {
    const actions: string[] = [];

    if (cognitiveHealth.overallHealth < 70) {
      actions.push('执行知识库整理和概念网络优化');
    }

    if (learningEfficiency.overallEfficiency < 70) {
      actions.push('增加学习循环频率和深度');
    }

    if (autonomy.overallAutonomy < 70) {
      actions.push('触发自主进化循环进行架构优化');
    }

    if (creativity.overallCreativity < 70) {
      actions.push('启动创意迭代系统进行作品改进');
    }

    if (systemStability.overallStability < 70) {
      actions.push('执行系统优化和资源清理');
    }

    return actions;
  }

  /**
   * 获取内存使用率
   */
  private async getMemoryUsage(): Promise<number> {
    try {
      const usage = process.memoryUsage();
      return (usage.heapUsed / usage.heapTotal) * 100;
    } catch {
      return 50;
    }
  }

  /**
   * 获取错误率
   */
  private async getErrorRate(): Promise<number> {
    try {
      // 从错误日志计算错误率
      const errorLogs = await this.db?.select().from('errorLogs').limit(100).catch(() => []);
      return (errorLogs?.length || 0) / 100;
    } catch {
      return 5;
    }
  }

  /**
   * 获取平均响应时间
   */
  private async getAverageResponseTime(): Promise<number> {
    try {
      // 从性能日志计算平均响应时间
      const performanceLogs = await this.db?.select().from('performanceLogs').limit(100);
      if (!performanceLogs || performanceLogs.length === 0) return 50;

      const avgTime = performanceLogs.reduce((sum: number, log: any) => sum + (log.responseTime || 0), 0) / performanceLogs.length;
      // 将响应时间（毫秒）转换为 0-100 的评分
      return Math.min(100, (avgTime / 1000) * 100);
    } catch {
      return 50;
    }
  }

  /**
   * 获取正常运行时间
   */
  private async getUptime(): Promise<number> {
    try {
      // 计算系统正常运行时间百分比
      const totalTime = Date.now() - (process.uptime() * 1000);
      const downtime = 0; // 假设没有宕机
      return 100 - (downtime / totalTime) * 100;
    } catch {
      return 95;
    }
  }

  /**
   * 保存评估结果
   */
  private async saveAssessmentResult(result: SelfAssessmentResult): Promise<void> {
    try {
      if (!this.db) return;

      await this.db.insert('metacognitiveAssessments').values({
        userId: this.userId,
        timestamp: result.timestamp,
        overallScore: result.overallScore,
        healthStatus: result.healthStatus,
        cognitiveHealthScore: result.cognitiveHealth.overallHealth,
        learningEfficiencyScore: result.learningEfficiency.overallEfficiency,
        autonomyScore: result.autonomy.overallAutonomy,
        creativityScore: result.creativity.overallCreativity,
        systemStabilityScore: result.systemStability.overallStability,
        keyInsights: JSON.stringify(result.keyInsights),
        recommendedActions: JSON.stringify(result.recommendedActions),
      });
    } catch (error) {
      console.error('[SelfAssessmentEngine] 保存评估结果失败:', error);
    }
  }
}

// 全局实例
let globalEngine: SelfAssessmentEngine | null = null;

export async function getSelfAssessmentEngine(userId: string): Promise<SelfAssessmentEngine> {
  if (!globalEngine) {
    globalEngine = new SelfAssessmentEngine(userId);
    await globalEngine.initialize();
  }
  return globalEngine;
}

export function resetSelfAssessmentEngine(): void {
  globalEngine = null;
}
