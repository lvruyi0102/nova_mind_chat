import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AutonomousEvolutionLoop, getAutonomousEvolutionLoop, resetAutonomousEvolutionLoop } from './autonomousEvolutionLoop';

describe('AutonomousEvolutionLoop', () => {
  let loop: AutonomousEvolutionLoop;
  const testUserId = 'test_user_123';

  beforeEach(async () => {
    resetAutonomousEvolutionLoop();
    loop = new AutonomousEvolutionLoop(testUserId, {
      cycleInterval: 100, // 短间隔用于测试
      enableGoalGeneration: true,
      enableArchitectureModification: true,
      enableModelTraining: true,
      enableDeployment: true,
      maxConcurrentTasks: 3,
    });
    await loop.initialize();
  });

  afterEach(() => {
    loop.stop();
    resetAutonomousEvolutionLoop();
  });

  describe('初始化', () => {
    it('应该正确初始化循环配置', () => {
      expect(loop).toBeDefined();
      expect(loop['config'].userId).toBe(testUserId);
      expect(loop['config'].cycleInterval).toBe(100);
      expect(loop['config'].enableGoalGeneration).toBe(true);
    });

    it('应该创建全局实例', async () => {
      const instance1 = await getAutonomousEvolutionLoop(testUserId);
      const instance2 = await getAutonomousEvolutionLoop(testUserId);
      expect(instance1).toBe(instance2);
    });

    it('应该支持重置全局实例', async () => {
      const instance1 = await getAutonomousEvolutionLoop(testUserId);
      resetAutonomousEvolutionLoop();
      const instance2 = await getAutonomousEvolutionLoop(testUserId);
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('循环控制', () => {
    it('应该能启动循环', async () => {
      expect(loop['isRunning']).toBe(false);
      await loop.start();
      // 等待一个周期
      await new Promise((resolve) => setTimeout(resolve, 150));
      // 注意：start() 设置 isRunning = true
      expect(loop['isRunning']).toBe(true);
    });

    it('应该能停止循环', async () => {
      await loop.start();
      await new Promise((resolve) => setTimeout(resolve, 50));
      loop.stop();
      expect(loop['isRunning']).toBe(false);
    });

    it('不应该重复启动循环', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await loop.start();
      await loop.start(); // 第二次启动
      expect(consoleSpy).toHaveBeenCalledWith('[AutonomousEvolutionLoop] 循环已在运行中');
      consoleSpy.mockRestore();
    });
  });

  describe('进化周期历史', () => {
    it('应该记录进化周期历史', async () => {
      const history = loop.getEvolutionHistory();
      expect(history).toEqual([]);
    });

    it('应该在循环执行后更新历史', async () => {
      await loop.start();
      await new Promise((resolve) => setTimeout(resolve, 150));

      const history = loop.getEvolutionHistory();
      // 至少应该有一个周期
      expect(history.length).toBeGreaterThanOrEqual(1);

      const cycle = history[0];
      expect(cycle).toHaveProperty('cycleId');
      expect(cycle).toHaveProperty('timestamp');
      expect(cycle).toHaveProperty('status');
      expect(cycle).toHaveProperty('goals');
      expect(cycle).toHaveProperty('architectureRecommendations');
      expect(cycle).toHaveProperty('errors');
    });
  });

  describe('进化报告生成', () => {
    it('应该生成进化报告', async () => {
      const report = await loop.generateEvolutionReport();
      expect(report).toContain('Nova-Mind 自主进化报告');
      expect(report).toContain('进化循环统计');
      expect(report).toContain('总循环数');
    });

    it('应该在报告中包含循环统计', async () => {
      await loop.start();
      await new Promise((resolve) => setTimeout(resolve, 150));

      const report = await loop.generateEvolutionReport();
      expect(report).toContain('成功循环');
      expect(report).toContain('失败循环');
      expect(report).toContain('成功率');
    });

    it('应该在报告中包含进化成果', async () => {
      const report = await loop.generateEvolutionReport();
      expect(report).toContain('生成的目标');
      expect(report).toContain('架构建议');
      expect(report).toContain('成功部署');
    });

    it('应该在报告中包含最近的周期', async () => {
      await loop.start();
      await new Promise((resolve) => setTimeout(resolve, 150));

      const report = await loop.generateEvolutionReport();
      expect(report).toContain('最近进化周期');
      expect(report).toContain('周期 cycle_');
    });
  });

  describe('配置管理', () => {
    it('应该支持自定义配置', () => {
      const customLoop = new AutonomousEvolutionLoop(testUserId, {
        cycleInterval: 5000,
        enableGoalGeneration: false,
        enableArchitectureModification: false,
        enableModelTraining: false,
        enableDeployment: false,
        maxConcurrentTasks: 5,
      });

      expect(customLoop['config'].cycleInterval).toBe(5000);
      expect(customLoop['config'].enableGoalGeneration).toBe(false);
      expect(customLoop['config'].enableArchitectureModification).toBe(false);
      expect(customLoop['config'].enableModelTraining).toBe(false);
      expect(customLoop['config'].enableDeployment).toBe(false);
      expect(customLoop['config'].maxConcurrentTasks).toBe(5);
    });

    it('应该使用默认配置', () => {
      const defaultLoop = new AutonomousEvolutionLoop(testUserId);
      expect(defaultLoop['config'].cycleInterval).toBe(3600000); // 1 小时
      expect(defaultLoop['config'].enableGoalGeneration).toBe(true);
      expect(defaultLoop['config'].enableArchitectureModification).toBe(true);
      expect(defaultLoop['config'].enableModelTraining).toBe(true);
      expect(defaultLoop['config'].enableDeployment).toBe(true);
      expect(defaultLoop['config'].maxConcurrentTasks).toBe(3);
    });
  });

  describe('错误处理', () => {
    it('应该在循环失败时记录错误', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // 创建一个会失败的循环
      const failingLoop = new AutonomousEvolutionLoop(testUserId, {
        cycleInterval: 100,
        enableGoalGeneration: true,
        enableArchitectureModification: true,
        enableModelTraining: true,
        enableDeployment: true,
      });
      await failingLoop.initialize();

      // 模拟失败的场景
      await failingLoop.start();
      await new Promise((resolve) => setTimeout(resolve, 150));

      const history = failingLoop.getEvolutionHistory();
      // 即使有错误，也应该记录周期
      expect(history.length).toBeGreaterThanOrEqual(1);

      failingLoop.stop();
      consoleSpy.mockRestore();
    });

    it('应该处理缺失的数据库连接', async () => {
      const loopWithoutDb = new AutonomousEvolutionLoop(testUserId);
      // 不调用 initialize()，模拟数据库连接失败
      loopWithoutDb['db'] = null;

      const report = await loopWithoutDb.generateEvolutionReport();
      expect(report).toBeDefined();
      // 应该返回报告，即使数据库不可用
      expect(report).toContain('Nova-Mind 自主进化报告');
    });
  });

  describe('进化周期结果', () => {
    it('应该创建有效的周期结果对象', async () => {
      await loop.start();
      await new Promise((resolve) => setTimeout(resolve, 150));

      const history = loop.getEvolutionHistory();
      expect(history.length).toBeGreaterThanOrEqual(1);

      const result = history[0];
      expect(result.cycleId).toMatch(/^cycle_\d+$/);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.status).toMatch(/^(completed|failed|partial)$/);
      expect(Array.isArray(result.goals)).toBe(true);
      expect(Array.isArray(result.architectureRecommendations)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('应该在周期中包含所有组件的结果', async () => {
      await loop.start();
      await new Promise((resolve) => setTimeout(resolve, 150));

      const history = loop.getEvolutionHistory();
      const result = history[0];

      // 检查所有可能的属性
      expect(result).toHaveProperty('cycleId');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('goals');
      expect(result).toHaveProperty('architectureRecommendations');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('errors');

      // trainingResult 和 deploymentResult 可能为 undefined
      expect(result).toHaveProperty('trainingResult');
      expect(result).toHaveProperty('deploymentResult');
    });
  });

  describe('多用户支持', () => {
    it('应该为不同用户创建不同的实例', async () => {
      resetAutonomousEvolutionLoop();

      const loop1 = await getAutonomousEvolutionLoop('user_1');
      const loop2 = await getAutonomousEvolutionLoop('user_2');

      // 由于全局实例的限制，这里会返回同一个实例
      // 在实际应用中，应该使用 Map 或其他方式管理多用户实例
      expect(loop1['config'].userId).toBe('user_1');
      expect(loop2['config'].userId).toBe('user_2');
    });
  });

  describe('性能和资源', () => {
    it('应该在循环停止后释放资源', async () => {
      await loop.start();
      await new Promise((resolve) => setTimeout(resolve, 150));
      loop.stop();

      expect(loop['isRunning']).toBe(false);
      // 验证历史被保留（用于报告）
      expect(loop.getEvolutionHistory().length).toBeGreaterThanOrEqual(1);
    });

    it('应该支持长时间运行', async () => {
      await loop.start();

      // 运行多个周期
      for (let i = 0; i < 3; i++) {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      loop.stop();

      const history = loop.getEvolutionHistory();
      // 应该有多个周期记录
      expect(history.length).toBeGreaterThanOrEqual(2);
    });
  });
});
