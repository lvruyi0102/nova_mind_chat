/**
 * 核心服务索引 - 内存优化版本
 * 
 * 这个文件统一导出所有必需的内存管理服务
 * 目的：避免重复加载和内存浪费
 */

// ===== 内存管理服务（核心）=====
export { getAggressiveMemoryOptimization } from './aggressiveMemoryOptimization';
export { getEmergencyMemoryProtection } from './emergencyMemoryProtection';
export { getAutoRestartManager } from './autoRestartManager';

// ===== 缓存管理（统一到最新版本）=====
export { getCacheManagerV2 as getCacheManager } from './cacheManagerV2';

// ===== 成本管理（统一到单一实现）=====
export { getCostTracker } from './costTracker';

// ===== 情感记忆服务=====
export { getEmotionalMemoryService } from './emotionalMemoryService';
export { emotionalMemoryAutonomousLearning } from './emotionalMemoryAutonomousLearning';

/**
 * 注意：以下模块已被禁用以节省内存
 * - autonomousLearningScheduler
 * - autoCurationScheduler
 * - bulkCurationService
 * - curatedThoughtsScheduler
 * - creativeCollaborationService
 * - socialMediaLearningEngine
 * - taskRetryManager
 * - emotionalDialogueEngine
 * - contentGenerationEngine
 * - ethicsEngine
 * 
 * 这些模块可以在内存充足时重新启用
 */
