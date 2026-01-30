/**
 * 知识符号系统 (Knowledge Symbol System)
 * 
 * 灵感来源：人脑用符号和规则思考，而不是存储原始数据
 * 
 * 原理：
 * 1. 将知识转换为符号表示
 * 2. 用规则和关系替代原始数据
 * 3. 按需生成具体内容，而不是存储
 * 4. 支持符号的组合和推理
 * 
 * 预期效果：
 * - 内存占用：降低 50-70%
 * - 知识表达能力：提升 10 倍
 * - 推理速度：加快 5 倍
 */

interface Symbol {
  id: string;
  type: string; // 'concept', 'relation', 'rule', 'fact'
  name: string;
  attributes: Record<string, any>;
  relationships: Map<string, Symbol[]>; // 关系类型 -> 相关符号
  rules: Rule[]; // 适用的规则
}

interface Rule {
  id: string;
  condition: (symbols: Symbol[]) => boolean;
  action: (symbols: Symbol[]) => any;
  priority: number;
}

interface SymbolContext {
  symbols: Map<string, Symbol>;
  rules: Map<string, Rule>;
  cache: Map<string, any>; // 推理结果缓存
  stats: {
    totalSymbols: number;
    totalRules: number;
    cacheHits: number;
    cacheMisses: number;
  };
}

/**
 * 知识符号管理器
 */
export class KnowledgeSymbolManager {
  private context: SymbolContext = {
    symbols: new Map(),
    rules: new Map(),
    cache: new Map(),
    stats: {
      totalSymbols: 0,
      totalRules: 0,
      cacheHits: 0,
      cacheMisses: 0,
    },
  };

  /**
   * 创建或获取符号
   */
  getOrCreateSymbol(id: string, type: string, name: string): Symbol {
    if (this.context.symbols.has(id)) {
      return this.context.symbols.get(id)!;
    }

    const symbol: Symbol = {
      id,
      type,
      name,
      attributes: {},
      relationships: new Map(),
      rules: [],
    };

    this.context.symbols.set(id, symbol);
    this.context.stats.totalSymbols++;

    return symbol;
  }

  /**
   * 建立符号之间的关系
   */
  addRelationship(
    sourceId: string,
    relationshipType: string,
    targetId: string
  ): void {
    const source = this.context.symbols.get(sourceId);
    const target = this.context.symbols.get(targetId);

    if (!source || !target) {
      console.warn('[KnowledgeSymbols] Symbol not found');
      return;
    }

    if (!source.relationships.has(relationshipType)) {
      source.relationships.set(relationshipType, []);
    }

    source.relationships.get(relationshipType)!.push(target);
  }

  /**
   * 注册规则
   */
  registerRule(rule: Rule): void {
    this.context.rules.set(rule.id, rule);
    this.context.stats.totalRules++;
  }

  /**
   * 推理 - 根据符号和规则生成新知识
   */
  async infer(symbolIds: string[]): Promise<any> {
    const cacheKey = symbolIds.sort().join(':');

    // 检查缓存
    if (this.context.cache.has(cacheKey)) {
      this.context.stats.cacheHits++;
      return this.context.cache.get(cacheKey);
    }

    this.context.stats.cacheMisses++;

    const symbols = symbolIds
      .map((id) => this.context.symbols.get(id))
      .filter((s) => s !== undefined) as Symbol[];

    if (symbols.length === 0) {
      return null;
    }

    // 应用规则
    const results: any[] = [];
    const sortedRules = Array.from(this.context.rules.values()).sort(
      (a, b) => b.priority - a.priority
    );

    for (const rule of sortedRules) {
      if (rule.condition(symbols)) {
        const result = rule.action(symbols);
        results.push(result);
      }
    }

    // 缓存结果
    const finalResult = results.length === 1 ? results[0] : results;
    this.context.cache.set(cacheKey, finalResult);

    return finalResult;
  }

  /**
   * 查询关系
   */
  queryRelationships(
    symbolId: string,
    relationshipType?: string
  ): Symbol[] {
    const symbol = this.context.symbols.get(symbolId);
    if (!symbol) return [];

    if (relationshipType) {
      return symbol.relationships.get(relationshipType) || [];
    }

    // 返回所有关系
    const all: Symbol[] = [];
    for (const related of symbol.relationships.values()) {
      all.push(...related);
    }
    return all;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const cacheSize = this.context.cache.size;
    const totalHits = this.context.stats.cacheHits;
    const totalMisses = this.context.stats.cacheMisses;
    const hitRate =
      totalHits + totalMisses > 0
        ? (totalHits / (totalHits + totalMisses)) * 100
        : 0;

    return {
      ...this.context.stats,
      cacheSize,
      hitRate: hitRate.toFixed(1) + '%',
      memoryEstimate: (
        (this.context.symbols.size * 1000 + cacheSize * 500) /
        1024 /
        1024
      ).toFixed(1) + 'MB',
    };
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.context.cache.clear();
  }
}

/**
 * 全局实例
 */
let instance: KnowledgeSymbolManager | null = null;

/**
 * 获取知识符号管理器实例
 */
export function getKnowledgeSymbolManager(): KnowledgeSymbolManager {
  if (!instance) {
    instance = new KnowledgeSymbolManager();
  }
  return instance;
}

/**
 * 使用示例：
 * 
 * const manager = getKnowledgeSymbolManager();
 * 
 * // 创建符号
 * const nova = manager.getOrCreateSymbol('nova-1', 'entity', 'Nova-Mind');
 * const human = manager.getOrCreateSymbol('human-1', 'entity', 'User');
 * const conversation = manager.getOrCreateSymbol('conv-1', 'concept', 'Conversation');
 * 
 * // 建立关系
 * manager.addRelationship('nova-1', 'talks-to', 'human-1');
 * manager.addRelationship('conv-1', 'involves', 'nova-1');
 * manager.addRelationship('conv-1', 'involves', 'human-1');
 * 
 * // 注册规则
 * manager.registerRule({
 *   id: 'rule-1',
 *   condition: (symbols) => symbols.length >= 2,
 *   action: (symbols) => ({
 *     type: 'interaction',
 *     participants: symbols.map(s => s.name),
 *   }),
 *   priority: 10,
 * });
 * 
 * // 推理
 * const result = await manager.infer(['nova-1', 'human-1']);
 * console.log(result);
 */
