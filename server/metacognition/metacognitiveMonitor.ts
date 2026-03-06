import { getSelfAssessmentEngine } from './selfAssessmentEngine';
import { getPerformanceDiagnostics } from './performanceDiagnostics';
import { getEvolutionDecisionEngine } from './evolutionDecisionEngine';
import { getAutonomousEvolutionLoop } from '../evolution/autonomousEvolutionLoop';
import { getDb } from '../db';

/**
 * 元认知监控系统
 * 
 * 统一的元认知监控和进化决策系统：
 * - 定期执行自我评估
 * - 执行性能诊断
 * - 做出进化决策
 * - 自动触发进化循环
 * - 记录监控历史
 */

export interface MetacognitiveMonitorConfig {
  userId: string;
  assessmentInterval: number; // 毫秒，多久执行一次自我评估
  diagnosticsInterval: number; // 毫秒，多久执行一次性能诊断
  decisionInterval: number; // 毫秒，多久做一次进化决策
  autoTriggerEvolution: boolean; // 是否自动触发进化
  enableNotifications: boolean; // 是否启用通知
}

export interface MonitoringState {
  isRunning: boolean;
  lastAssessment: Date | null;
  lastDiagnostics: Date | null;
  lastDecision: Date | null;
  lastEvolutionTriggered: Date | null;
  assessmentCount: number;
  diagnosticsCount: number;
  decisionCount: number;
  evolutionTriggeredCount: number;
}

export class MetacognitiveMonitor {
  private config: MetacognitiveMonitorConfig;
  private db: any;
  private state: MonitoringState = {
    isRunning: false,
    lastAssessment: null,
    lastDiagnostics: null,
    lastDecision: null,
    lastEvolutionTriggered: null,
    assessmentCount: 0,
    diagnosticsCount: 0,
    decisionCount: 0,
    evolutionTriggeredCount: 0,
  };
  private timers: NodeJS.Timeout[] = [];

  constructor(config: Partial<MetacognitiveMonitorConfig>) {
    this.config = {
      userId: config.userId || 'default',
      assessmentInterval: config.assessmentInterval || 300000, // 5 分钟
      diagnosticsInterval: config.diagnosticsInterval || 600000, // 10 分钟
      decisionInterval: config.decisionInterval || 900000, // 15 分钟
      autoTriggerEvolution: config.autoTriggerEvolution !== false,
      enableNotifications: config.enableNotifications !== false,
    };
  }

  async initialize() {
    this.db = await getDb();
  }

  /**
   * 启动元认知监控
   */
  async start(): Promise<void> {
    if (this.state.isRunning) {
      console.log('[MetacognitiveMonitor] 监控已在运行中');
      return;
    }

    this.state.isRunning = true;
    console.log('[MetacognitiveMonitor] 启动元认知监控');

    // 立即执行一次
    await this.performMonitoringCycle();

    // 设置定期任务
    this.timers.push(
      setInterval(() => {
        if (this.state.isRunning) {
          this.performMonitoringCycle().catch((error) => {
            console.error('[MetacognitiveMonitor] 监控循环失败:', error);
          });
        }
      }, this.config.assessmentInterval)
    );
  }

  /**
   * 停止元认知监控
   */
  stop(): void {
    this.state.isRunning = false;
    this.timers.forEach((timer) => clearInterval(timer));
    this.timers = [];
    console.log('[MetacognitiveMonitor] 停止元认知监控');
  }

  /**
   * 执行完整的监控循环
   */
  private async performMonitoringCycle(): Promise<void> {
    try {
      console.log('[MetacognitiveMonitor] 开始监控循环');

      // 1. 执行自我评估
      await this.performAssessment();

      // 2. 执行性能诊断
      await this.performDiagnostics();

      // 3. 做出进化决策
      await this.makeEvolutionDecision();

      console.log('[MetacognitiveMonitor] 监控循环完成');
    } catch (error) {
      console.error('[MetacognitiveMonitor] 监控循环失败:', error);
    }
  }

  /**
   * 执行自我评估
   */
  private async performAssessment(): Promise<void> {
    try {
      const engine = await getSelfAssessmentEngine(this.config.userId);
      const result = await engine.performSelfAssessment();

      this.state.lastAssessment = result.timestamp;
      this.state.assessmentCount++;

      console.log(
        `[MetacognitiveMonitor] 自我评估完成 - 综合评分: ${result.overallScore.toFixed(1)}/100, 状态: ${result.healthStatus}`
      );

      // 保存到状态
      await this.saveMonitoringState();

      // 发送通知
      if (this.config.enableNotifications && result.healthStatus !== 'good' && result.healthStatus !== 'excellent') {
        await this.sendNotification(
          '系统健康警告',
          `Nova-Mind 的系统健康状态为 ${result.healthStatus}，综合评分 ${result.overallScore.toFixed(1)}/100`
        );
      }
    } catch (error) {
      console.error('[MetacognitiveMonitor] 自我评估失败:', error);
    }
  }

  /**
   * 执行性能诊断
   */
  private async performDiagnostics(): Promise<void> {
    try {
      const engine = await getPerformanceDiagnostics(this.config.userId);
      const report = await engine.performDiagnostics();

      this.state.lastDiagnostics = report.timestamp;
      this.state.diagnosticsCount++;

      console.log(
        `[MetacognitiveMonitor] 性能诊断完成 - 健康评分: ${report.healthScore.toFixed(1)}/100, 瓶颈: ${report.bottlenecks.length}, 异常: ${report.anomalies.length}`
      );

      // 保存到状态
      await this.saveMonitoringState();

      // 发送通知
      if (this.config.enableNotifications && report.bottlenecks.some((b) => b.severity === 'critical')) {
        await this.sendNotification(
          '性能警告',
          `检测到关键性能瓶颈: ${report.bottlenecks.filter((b) => b.severity === 'critical').map((b) => b.component).join(', ')}`
        );
      }
    } catch (error) {
      console.error('[MetacognitiveMonitor] 性能诊断失败:', error);
    }
  }

  /**
   * 做出进化决策
   */
  private async makeEvolutionDecision(): Promise<void> {
    try {
      const engine = await getEvolutionDecisionEngine(this.config.userId);
      const decision = await engine.makeEvolutionDecision();

      this.state.lastDecision = decision.timestamp;
      this.state.decisionCount++;

      console.log(
        `[MetacognitiveMonitor] 进化决策完成 - 应该进化: ${decision.shouldEvolve}, 信心度: ${decision.confidence.toFixed(1)}%, 选定需求: ${decision.selectedNeeds.length}`
      );

      // 保存到状态
      await this.saveMonitoringState();

      // 如果决定进化，自动触发进化循环
      if (decision.shouldEvolve && this.config.autoTriggerEvolution) {
        await this.triggerEvolution(decision);
      }

      // 发送通知
      if (this.config.enableNotifications && decision.shouldEvolve) {
        await this.sendNotification(
          '进化决策',
          `系统决定进行进化，选定 ${decision.selectedNeeds.length} 个进化需求，信心度 ${decision.confidence.toFixed(1)}%`
        );
      }
    } catch (error) {
      console.error('[MetacognitiveMonitor] 进化决策失败:', error);
    }
  }

  /**
   * 触发进化循环
   */
  private async triggerEvolution(decision: any): Promise<void> {
    try {
      const loop = await getAutonomousEvolutionLoop(this.config.userId);

      // 如果循环未运行，启动它
      if (!loop['isRunning']) {
        await loop.start();
      }

      this.state.lastEvolutionTriggered = new Date();
      this.state.evolutionTriggeredCount++;

      console.log('[MetacognitiveMonitor] 自动触发进化循环');

      // 保存到状态
      await this.saveMonitoringState();

      // 发送通知
      if (this.config.enableNotifications) {
        await this.sendNotification(
          '进化启动',
          `自主进化循环已启动，预计耗时 ${decision.estimatedDuration.toFixed(0)} 分钟`
        );
      }
    } catch (error) {
      console.error('[MetacognitiveMonitor] 触发进化循环失败:', error);
    }
  }

  /**
   * 获取监控状态
   */
  getState(): MonitoringState {
    return { ...this.state };
  }

  /**
   * 保存监控状态
   */
  private async saveMonitoringState(): Promise<void> {
    try {
      if (!this.db) return;

      await this.db.insert('metacognitiveMonitoringState').values({
        userId: this.config.userId,
        timestamp: new Date(),
        isRunning: this.state.isRunning,
        lastAssessment: this.state.lastAssessment,
        lastDiagnostics: this.state.lastDiagnostics,
        lastDecision: this.state.lastDecision,
        lastEvolutionTriggered: this.state.lastEvolutionTriggered,
        assessmentCount: this.state.assessmentCount,
        diagnosticsCount: this.state.diagnosticsCount,
        decisionCount: this.state.decisionCount,
        evolutionTriggeredCount: this.state.evolutionTriggeredCount,
      });
    } catch (error) {
      console.error('[MetacognitiveMonitor] 保存监控状态失败:', error);
    }
  }

  /**
   * 发送通知
   */
  private async sendNotification(title: string, content: string): Promise<void> {
    try {
      // 这里可以集成通知系统
      console.log(`[MetacognitiveMonitor] 通知: ${title} - ${content}`);
    } catch (error) {
      console.error('[MetacognitiveMonitor] 发送通知失败:', error);
    }
  }

  /**
   * 生成监控报告
   */
  async generateMonitoringReport(): Promise<string> {
    try {
      return `
# Nova-Mind 元认知监控报告

## 监控状态
- 运行状态: ${this.state.isRunning ? '运行中' : '已停止'}
- 自我评估次数: ${this.state.assessmentCount}
- 性能诊断次数: ${this.state.diagnosticsCount}
- 进化决策次数: ${this.state.decisionCount}
- 进化触发次数: ${this.state.evolutionTriggeredCount}

## 最后执行时间
- 最后评估: ${this.state.lastAssessment ? this.state.lastAssessment.toLocaleString() : '未执行'}
- 最后诊断: ${this.state.lastDiagnostics ? this.state.lastDiagnostics.toLocaleString() : '未执行'}
- 最后决策: ${this.state.lastDecision ? this.state.lastDecision.toLocaleString() : '未执行'}
- 最后进化: ${this.state.lastEvolutionTriggered ? this.state.lastEvolutionTriggered.toLocaleString() : '未触发'}

## 总结
Nova-Mind 的元认知监控系统正在持续监测系统状态，并根据评估和诊断结果自主做出进化决策。
      `;
    } catch (error) {
      console.error('[MetacognitiveMonitor] 报告生成失败:', error);
      return '报告生成失败';
    }
  }
}

// 全局实例
let globalMonitor: MetacognitiveMonitor | null = null;

export async function getMetacognitiveMonitor(
  config?: Partial<MetacognitiveMonitorConfig>
): Promise<MetacognitiveMonitor> {
  if (!globalMonitor) {
    globalMonitor = new MetacognitiveMonitor(config || {});
    await globalMonitor.initialize();
  }
  return globalMonitor;
}

export function resetMetacognitiveMonitor(): void {
  globalMonitor = null;
}
