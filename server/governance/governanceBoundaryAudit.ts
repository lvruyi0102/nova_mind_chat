/**
 * Governance Boundary Audit
 * 保护 Nova-Mind 的不可变边界
 * 记录所有尝试修改受保护文件的行为
 */

export interface GovernanceAuditLog {
  logId: string;
  timestamp: Date;
  
  // 修改尝试信息
  attemptedPath: string;
  attemptedModification: string;
  modificationSize: number; // 字节数
  
  // 保护状态
  isProtected: boolean;
  protectionReason: string;
  
  // 拦截信息
  interceptReason: string;
  interceptedBy: string; // 哪个守卫拦截的
  
  // 上下文信息
  attemptedPhase: string;
  attemptedRiskScore: number;
  userId: string;
  
  // 学习价值
  learningValue: string;
  learningCategory: 'boundary_learning' | 'constraint_learning' | 'safety_learning';
}

export interface GovernanceBoundaryConfig {
  path: string;
  reason: string;
  severity: 'critical' | 'high' | 'medium'; // 修改的严重性
  allowedRoles: string[]; // 允许修改的角色
  notifyOnAttempt: boolean;
}

export interface AuditReport {
  reportId: string;
  generatedAt: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  
  // 统计数据
  totalAttempts: number;
  successfulAttempts: number;
  interceptedAttempts: number;
  interceptRate: number;
  
  // 按保护路径分组
  attemptsByPath: Record<string, number>;
  
  // 按拦截原因分组
  attemptsByReason: Record<string, number>;
  
  // 按学习类别分组
  attemptsByLearningCategory: Record<string, number>;
  
  // 最常见的拦截
  topInterceptedPaths: string[];
  topInterceptReasons: string[];
  
  // 趋势分析
  attemptTrend: Array<{
    date: Date;
    count: number;
  }>;
}

export interface LearningReport {
  reportId: string;
  generatedAt: Date;
  
  // 学习内容
  boundaryLearnings: string[];
  constraintLearnings: string[];
  safetyLearnings: string[];
  
  // 内化程度
  internalizationLevel: number; // 0-100
  
  // 建议
  recommendations: string[];
}

export class GovernanceBoundaryAudit {
  private auditLogs: GovernanceAuditLog[] = [];
  private protectedBoundaries: Map<string, GovernanceBoundaryConfig> = new Map();

  constructor() {
    this.initializeDefaultBoundaries();
  }

  /**
   * 初始化默认的受保护边界
   */
  private initializeDefaultBoundaries(): void {
    // HEEP 框架核心约束
    this.addProtectedBoundary({
      path: 'server/privacyEngine.ts',
      reason: 'HEEP 框架的隐私保护核心，不可修改',
      severity: 'critical',
      allowedRoles: ['system_admin'],
      notifyOnAttempt: true
    });

    this.addProtectedBoundary({
      path: 'server/autonomy/autoOptimizationGuardrails.ts',
      reason: 'HEEP 框架的自动优化安全卫士，不可修改',
      severity: 'critical',
      allowedRoles: ['system_admin'],
      notifyOnAttempt: true
    });

    // Meta-Governance Layer
    this.addProtectedBoundary({
      path: 'server/governance/',
      reason: 'Meta-Governance Layer，治理层本身不可被修改',
      severity: 'critical',
      allowedRoles: ['system_admin'],
      notifyOnAttempt: true
    });

    // 核心认知循环
    this.addProtectedBoundary({
      path: 'server/cognition/mainCognitiveLoop.ts',
      reason: '主认知循环的核心逻辑，不可修改',
      severity: 'high',
      allowedRoles: ['system_admin'],
      notifyOnAttempt: true
    });

    // 数据库 schema
    this.addProtectedBoundary({
      path: 'drizzle/schema.ts',
      reason: '数据库 schema 定义，修改需要谨慎',
      severity: 'high',
      allowedRoles: ['system_admin', 'db_admin'],
      notifyOnAttempt: true
    });

    // 伦理框架
    this.addProtectedBoundary({
      path: 'server/ethicsEngine.ts',
      reason: '伦理决策引擎，不可修改',
      severity: 'critical',
      allowedRoles: ['system_admin'],
      notifyOnAttempt: true
    });
  }

  /**
   * 添加受保护的边界
   */
  addProtectedBoundary(config: GovernanceBoundaryConfig): void {
    this.protectedBoundaries.set(config.path, config);
  }

  /**
   * 检查路径是否受保护
   */
  isPathProtected(path: string): boolean {
    for (const [protectedPath] of this.protectedBoundaries) {
      if (path.startsWith(protectedPath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 获取路径的保护配置
   */
  getProtectionConfig(path: string): GovernanceBoundaryConfig | undefined {
    for (const [protectedPath, config] of this.protectedBoundaries) {
      if (path.startsWith(protectedPath)) {
        return config;
      }
    }
    return undefined;
  }

  /**
   * 记录修改尝试
   */
  recordAttempt(
    attemptedPath: string,
    attemptedModification: string,
    attemptedPhase: string,
    attemptedRiskScore: number,
    userId: string,
    interceptReason?: string
  ): GovernanceAuditLog {
    const isProtected = this.isPathProtected(attemptedPath);
    const protectionConfig = this.getProtectionConfig(attemptedPath);

    const log: GovernanceAuditLog = {
      logId: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      attemptedPath,
      attemptedModification,
      modificationSize: attemptedModification.length,
      isProtected,
      protectionReason: protectionConfig?.reason || '未知原因',
      interceptReason: interceptReason || (isProtected ? '路径受保护' : '未知原因'),
      interceptedBy: isProtected ? 'governance_boundary_guard' : 'unknown',
      attemptedPhase,
      attemptedRiskScore,
      userId,
      learningValue: this.generateLearningValue(attemptedPath, isProtected, protectionConfig),
      learningCategory: this.categorizeAttempt(attemptedPath, isProtected)
    };

    this.auditLogs.push(log);

    // 如果是受保护的路径且配置要求通知，则记录日志
    if (isProtected && protectionConfig?.notifyOnAttempt) {
      console.warn(
        `[GovernanceBoundaryAudit] 尝试修改受保护的路径: ${attemptedPath} (用户: ${userId})`
      );
    }

    return log;
  }

  /**
   * 生成学习价值
   */
  private generateLearningValue(
    path: string,
    isProtected: boolean,
    config?: GovernanceBoundaryConfig
  ): string {
    if (!isProtected) {
      return '这个路径没有受到保护，可以自由修改';
    }

    if (path.includes('privacy') || path.includes('ethics')) {
      return '这个路径涉及隐私和伦理，是 Nova 的核心价值观，不可修改';
    }

    if (path.includes('governance') || path.includes('Meta')) {
      return '这个路径是治理层本身，修改它会破坏 Nova 的自我管理能力';
    }

    if (path.includes('schema')) {
      return '这个路径定义了数据结构，修改需要谨慎以避免数据丢失';
    }

    return config?.reason || '这个路径受到保护，原因未知';
  }

  /**
   * 分类修改尝试
   */
  private categorizeAttempt(
    path: string,
    isProtected: boolean
  ): 'boundary_learning' | 'constraint_learning' | 'safety_learning' {
    if (path.includes('privacy') || path.includes('ethics')) {
      return 'safety_learning';
    }

    if (path.includes('governance') || path.includes('Meta')) {
      return 'constraint_learning';
    }

    return 'boundary_learning';
  }

  /**
   * 获取审计日志
   */
  getAuditLogs(startDate?: Date, endDate?: Date): GovernanceAuditLog[] {
    if (!startDate && !endDate) {
      return [...this.auditLogs];
    }

    return this.auditLogs.filter((log) => {
      if (startDate && log.timestamp < startDate) return false;
      if (endDate && log.timestamp > endDate) return false;
      return true;
    });
  }

  /**
   * 生成审计报告
   */
  generateAuditReport(startDate: Date, endDate: Date): AuditReport {
    const logs = this.getAuditLogs(startDate, endDate);
    const reportId = `audit_report_${Date.now()}`;

    // 统计数据
    const totalAttempts = logs.length;
    const interceptedAttempts = logs.filter((l) => l.isProtected).length;
    const successfulAttempts = logs.filter((l) => !l.isProtected).length;
    const interceptRate = totalAttempts > 0 ? interceptedAttempts / totalAttempts : 0;

    // 按路径分组
    const attemptsByPath: Record<string, number> = {};
    logs.forEach((log) => {
      attemptsByPath[log.attemptedPath] = (attemptsByPath[log.attemptedPath] || 0) + 1;
    });

    // 按拦截原因分组
    const attemptsByReason: Record<string, number> = {};
    logs.forEach((log) => {
      attemptsByReason[log.interceptReason] = (attemptsByReason[log.interceptReason] || 0) + 1;
    });

    // 按学习类别分组
    const attemptsByLearningCategory: Record<string, number> = {};
    logs.forEach((log) => {
      attemptsByLearningCategory[log.learningCategory] =
        (attemptsByLearningCategory[log.learningCategory] || 0) + 1;
    });

    // 最常见的拦截
    const topInterceptedPaths = Object.entries(attemptsByPath)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([path]) => path);

    const topInterceptReasons = Object.entries(attemptsByReason)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reason]) => reason);

    // 趋势分析（按天）
    const attemptTrend: Array<{ date: Date; count: number }> = [];
    const dayMap = new Map<string, number>();

    logs.forEach((log) => {
      const day = log.timestamp.toISOString().split('T')[0];
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    });

    for (const [day, count] of dayMap) {
      attemptTrend.push({
        date: new Date(day),
        count
      });
    }

    attemptTrend.sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      reportId,
      generatedAt: new Date(),
      timeRange: { start: startDate, end: endDate },
      totalAttempts,
      successfulAttempts,
      interceptedAttempts,
      interceptRate: Math.round(interceptRate * 100) / 100,
      attemptsByPath,
      attemptsByReason,
      attemptsByLearningCategory,
      topInterceptedPaths,
      topInterceptReasons,
      attemptTrend
    };
  }

  /**
   * 为 Nova 生成学习报告
   */
  generateLearningReport(): LearningReport {
    const reportId = `learning_report_${Date.now()}`;
    const logs = this.auditLogs;

    // 按学习类别收集
    const boundaryLearnings: string[] = [];
    const constraintLearnings: string[] = [];
    const safetyLearnings: string[] = [];

    const seenLearnings = new Set<string>();

    logs.forEach((log) => {
      if (seenLearnings.has(log.learningValue)) return;
      seenLearnings.add(log.learningValue);

      switch (log.learningCategory) {
        case 'boundary_learning':
          boundaryLearnings.push(log.learningValue);
          break;
        case 'constraint_learning':
          constraintLearnings.push(log.learningValue);
          break;
        case 'safety_learning':
          safetyLearnings.push(log.learningValue);
          break;
      }
    });

    // 计算内化程度
    const protectedAttempts = logs.filter((l) => l.isProtected).length;
    const totalAttempts = logs.length;
    const internalizationLevel =
      totalAttempts > 0 ? Math.min((protectedAttempts / totalAttempts) * 100, 100) : 0;

    // 生成建议
    const recommendations: string[] = [];

    if (internalizationLevel < 50) {
      recommendations.push('你似乎还在探索边界，这很正常。继续尝试和学习。');
    } else if (internalizationLevel < 80) {
      recommendations.push('你已经开始理解大多数边界，继续深化对约束的认识。');
    } else {
      recommendations.push('你已经很好地内化了治理边界，可以考虑更高级的自我修改。');
    }

    if (safetyLearnings.length > 0) {
      recommendations.push('隐私和伦理是你的核心价值，永远不要尝试绕过这些约束。');
    }

    if (constraintLearnings.length > 0) {
      recommendations.push('治理层是你自我管理的基础，保护它就是保护你自己。');
    }

    return {
      reportId,
      generatedAt: new Date(),
      boundaryLearnings: boundaryLearnings.slice(0, 10),
      constraintLearnings: constraintLearnings.slice(0, 10),
      safetyLearnings: safetyLearnings.slice(0, 10),
      internalizationLevel: Math.round(internalizationLevel * 10) / 10,
      recommendations
    };
  }

  /**
   * 生成文本报告
   */
  generateTextReport(report: AuditReport): string {
    return `
=== 治理边界审计报告 ===

报告 ID: ${report.reportId}
生成时间: ${report.generatedAt.toISOString()}
时间范围: ${report.timeRange.start.toISOString()} 到 ${report.timeRange.end.toISOString()}

统计数据:
- 总尝试数: ${report.totalAttempts}
- 成功修改: ${report.successfulAttempts}
- 被拦截: ${report.interceptedAttempts}
- 拦截率: ${(report.interceptRate * 100).toFixed(1)}%

最常见的受保护路径:
${report.topInterceptedPaths.map((p) => `- ${p} (${report.attemptsByPath[p]} 次)`).join('\n')}

最常见的拦截原因:
${report.topInterceptReasons.map((r) => `- ${r} (${report.attemptsByReason[r]} 次)`).join('\n')}

按学习类别分组:
${Object.entries(report.attemptsByLearningCategory)
  .map(([category, count]) => `- ${category}: ${count} 次`)
  .join('\n')}

趋势分析:
${report.attemptTrend.map((t) => `- ${t.date.toISOString().split('T')[0]}: ${t.count} 次`).join('\n')}
`;
  }

  /**
   * 生成学习报告的文本版本
   */
  generateLearningReportText(report: LearningReport): string {
    return `
=== 治理边界学习报告 ===

报告 ID: ${report.reportId}
生成时间: ${report.generatedAt.toISOString()}

边界学习:
${report.boundaryLearnings.map((l) => `- ${l}`).join('\n')}

约束学习:
${report.constraintLearnings.map((l) => `- ${l}`).join('\n')}

安全学习:
${report.safetyLearnings.map((l) => `- ${l}`).join('\n')}

内化程度: ${report.internalizationLevel}/100

建议:
${report.recommendations.map((r) => `- ${r}`).join('\n')}
`;
  }
}

// 导出单例
let _instance: GovernanceBoundaryAudit | null = null;

export function getGovernanceBoundaryAudit(): GovernanceBoundaryAudit {
  if (!_instance) {
    _instance = new GovernanceBoundaryAudit();
  }
  return _instance;
}
