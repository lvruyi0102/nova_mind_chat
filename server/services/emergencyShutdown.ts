/**
 * 紧急关闭机制
 * 当内存无法恢复时，自动关闭可选功能或服务
 */

interface ShutdownConfig {
  criticalThreshold: number; // 紧急阈值（95%）
  shutdownThreshold: number; // 关闭阈值（98%）
  checkInterval: number; // 检查间隔（30 秒）
  consecutiveFailures: number; // 连续失败次数阈值（3 次）
}

type FeatureState = "enabled" | "disabled" | "critical";

interface SystemState {
  features: {
    backgroundTasks: FeatureState;
    emotionalMemory: FeatureState;
    autonomousLearning: FeatureState;
    relationshipTracking: FeatureState;
    creativeCuration: FeatureState;
  };
  lastCheckTime: number;
  consecutiveHighMemory: number;
  isEmergencyMode: boolean;
}

class EmergencyShutdown {
  private static instance: EmergencyShutdown | null = null;
  private config: ShutdownConfig = {
    criticalThreshold: 0.95,
    shutdownThreshold: 0.98,
    checkInterval: 30 * 1000,
    consecutiveFailures: 3,
  };

  private state: SystemState = {
    features: {
      backgroundTasks: "enabled",
      emotionalMemory: "enabled",
      autonomousLearning: "enabled",
      relationshipTracking: "enabled",
      creativeCuration: "enabled",
    },
    lastCheckTime: Date.now(),
    consecutiveHighMemory: 0,
    isEmergencyMode: false,
  };

  private checkInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startEmergencyMonitoring();
  }

  static getInstance(): EmergencyShutdown {
    if (!EmergencyShutdown.instance) {
      EmergencyShutdown.instance = new EmergencyShutdown();
    }
    return EmergencyShutdown.instance;
  }

  /**
   * 启动紧急监控
   */
  private startEmergencyMonitoring(): void {
    this.checkInterval = setInterval(() => {
      this.checkSystemHealth();
    }, this.config.checkInterval);

    console.log("[EmergencyShutdown] Emergency monitoring started");
  }

  /**
   * 检查系统健康状态
   */
  private checkSystemHealth(): void {
    const memUsage = process.memoryUsage();
    const heapUsagePercent = memUsage.heapUsed / memUsage.heapTotal;

    if (heapUsagePercent > this.config.shutdownThreshold) {
      console.error(
        `[EmergencyShutdown] CRITICAL: Heap usage at ${(heapUsagePercent * 100).toFixed(1)}% - initiating emergency shutdown`
      );
      this.initiateEmergencyShutdown();
    } else if (heapUsagePercent > this.config.criticalThreshold) {
      console.error(
        `[EmergencyShutdown] WARNING: Heap usage at ${(heapUsagePercent * 100).toFixed(1)}% - entering critical mode`
      );
      this.enterCriticalMode();
      this.state.consecutiveHighMemory++;
    } else {
      this.state.consecutiveHighMemory = 0;
      if (this.state.isEmergencyMode) {
        this.exitEmergencyMode();
      }
    }

    this.state.lastCheckTime = Date.now();
  }

  /**
   * 进入临界模式
   */
  private enterCriticalMode(): void {
    if (this.state.isEmergencyMode) return;

    console.warn("[EmergencyShutdown] Entering critical mode");

    // 禁用可选功能
    this.disableFeature("creativeCuration");
    this.disableFeature("autonomousLearning");
    this.disableFeature("relationshipTracking");
    this.disableFeature("emotionalMemory");

    this.state.isEmergencyMode = true;
  }

  /**
   * 启动紧急关闭
   */
  private initiateEmergencyShutdown(): void {
    console.error("[EmergencyShutdown] INITIATING EMERGENCY SHUTDOWN");

    // 禁用所有可选功能
    this.disableFeature("backgroundTasks");
    this.disableFeature("emotionalMemory");
    this.disableFeature("autonomousLearning");
    this.disableFeature("relationshipTracking");
    this.disableFeature("creativeCuration");

    // 强制垃圾回收
    if (global.gc) {
      global.gc();
      global.gc();
      global.gc();
    }

    console.error("[EmergencyShutdown] All non-critical features disabled");
    console.error("[EmergencyShutdown] System in maintenance mode");

    // 发送告警通知
    this.sendEmergencyAlert();
  }

  /**
   * 退出紧急模式
   */
  private exitEmergencyMode(): void {
    if (!this.state.isEmergencyMode) return;

    console.log("[EmergencyShutdown] Exiting emergency mode");

    // 逐步重新启用功能
    this.enableFeature("emotionalMemory");
    this.enableFeature("relationshipTracking");
    this.enableFeature("autonomousLearning");
    this.enableFeature("creativeCuration");
    this.enableFeature("backgroundTasks");

    this.state.isEmergencyMode = false;
  }

  /**
   * 禁用功能
   */
  private disableFeature(feature: keyof SystemState["features"]): void {
    if (this.state.features[feature] === "enabled") {
      this.state.features[feature] = "disabled";
      console.warn(`[EmergencyShutdown] Feature disabled: ${feature}`);
    }
  }

  /**
   * 启用功能
   */
  private enableFeature(feature: keyof SystemState["features"]): void {
    if (this.state.features[feature] === "disabled") {
      this.state.features[feature] = "enabled";
      console.log(`[EmergencyShutdown] Feature enabled: ${feature}`);
    }
  }

  /**
   * 发送紧急告警
   */
  private sendEmergencyAlert(): void {
    const memUsage = process.memoryUsage();
    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    console.error(`
╔════════════════════════════════════════════════════════════╗
║                   EMERGENCY ALERT                          ║
╠════════════════════════════════════════════════════════════╣
║ System Memory Critical                                     ║
║ Heap Usage: ${heapUsagePercent.toFixed(1)}%                                ║
║ Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(0)}MB / ${(memUsage.heapTotal / 1024 / 1024).toFixed(0)}MB                         ║
║ RSS: ${(memUsage.rss / 1024 / 1024).toFixed(0)}MB                                    ║
║                                                            ║
║ Actions Taken:                                             ║
║ - All non-critical features disabled                       ║
║ - System in maintenance mode                               ║
║ - Garbage collection triggered                             ║
║                                                            ║
║ Next Steps:                                                ║
║ - Check application logs                                   ║
║ - Consider restarting the service                          ║
║ - Review memory usage patterns                             ║
╚════════════════════════════════════════════════════════════╝
    `);
  }

  /**
   * 检查功能是否启用
   */
  isFeatureEnabled(feature: keyof SystemState["features"]): boolean {
    return this.state.features[feature] === "enabled";
  }

  /**
   * 获取系统状态
   */
  getSystemState(): SystemState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log("[EmergencyShutdown] Monitoring stopped");
    }
  }
}

export function getEmergencyShutdown(): EmergencyShutdown {
  return EmergencyShutdown.getInstance();
}
