/**
 * 自迭代系统初始化
 * 在服务器启动时初始化所有必要的组件
 */

import { getRuleManager } from "./fileBasedRuleManager";
import { getFailureDetector } from "./failureDetector";
import { getBackgroundTask } from "../backgroundTasks/selfIterationBackgroundTask";
import { seedInitialRules } from "./seedRules";

let isInitialized = false;

/**
 * 初始化自迭代系统
 */
export async function initializeSelfIterationSystem(): Promise<void> {
  if (isInitialized) {
    console.log("[SelfIterationSystem] 系统已初始化，跳过重复初始化");
    return;
  }

  try {
    console.log("[SelfIterationSystem] 开始初始化...");

    // 1. 初始化规则管理器
    console.log("[SelfIterationSystem] 初始化规则管理器...");
    const ruleManager = await getRuleManager();
    console.log("[SelfIterationSystem] 规则管理器初始化完成");
    
    // 1.5. 初始化规则种子数据
    console.log("[SelfIterationSystem] 初始化规则种子数据...");
    await seedInitialRules();
    console.log("[SelfIterationSystem] 规则种子数据初始化完成");

    // 2. 初始化失败检测器
    console.log("[SelfIterationSystem] 初始化失败检测器...");
    const failureDetector = getFailureDetector();
    console.log("[SelfIterationSystem] 失败检测器初始化完成");

    // 3. 启动后台任务
    console.log("[SelfIterationSystem] 启动后台自迭代任务...");
    const backgroundTask = getBackgroundTask();
    await backgroundTask.start();
    console.log("[SelfIterationSystem] 后台任务已启动");

    // 4. 获取初始统计信息
    const stats = await ruleManager.getStatistics();
    console.log("[SelfIterationSystem] 初始统计信息:", {
      totalRules: stats.totalRules,
      activeRules: stats.activeRules,
      totalExecutions: stats.totalExecutions,
    });

    isInitialized = true;
    console.log("[SelfIterationSystem] 初始化完成");
  } catch (error) {
    console.error("[SelfIterationSystem] 初始化失败:", error);
    throw error;
  }
}

/**
 * 关闭自迭代系统
 */
export async function shutdownSelfIterationSystem(): Promise<void> {
  try {
    console.log("[SelfIterationSystem] 关闭系统...");

    const backgroundTask = getBackgroundTask();
    await backgroundTask.stop();

    console.log("[SelfIterationSystem] 系统已关闭");
    isInitialized = false;
  } catch (error) {
    console.error("[SelfIterationSystem] 关闭失败:", error);
    throw error;
  }
}

/**
 * 获取初始化状态
 */
export function isSystemInitialized(): boolean {
  return isInitialized;
}

/**
 * 获取系统健康状态
 */
export async function getSystemHealth(): Promise<{
  initialized: boolean;
  backgroundTaskRunning: boolean;
  lastBackgroundTaskRun: Date | null;
  totalRules: number;
  activeRules: number;
}> {
  try {
    const ruleManager = await getRuleManager();
    const backgroundTask = getBackgroundTask();
    const stats = await ruleManager.getStatistics();
    const taskStatus = backgroundTask.getStatus();

    return {
      initialized: isInitialized,
      backgroundTaskRunning: taskStatus.isRunning,
      lastBackgroundTaskRun: taskStatus.lastRun,
      totalRules: stats.totalRules,
      activeRules: stats.activeRules,
    };
  } catch (error) {
    console.error("[SelfIterationSystem] 获取健康状态失败:", error);
    return {
      initialized: false,
      backgroundTaskRunning: false,
      lastBackgroundTaskRun: null,
      totalRules: 0,
      activeRules: 0,
    };
  }
}
