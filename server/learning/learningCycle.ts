/**
 * Nova-Mind 真实学习循环
 * 
 * 核心原理：
 * 1. 符号提取 - 从对话中识别关键概念、实体、关系
 * 2. 关系学习 - 建立概念之间的语义关系
 * 3. 规则学习 - 从对话模式中推导出规则和规律
 * 4. 思想精选 - 将学到的知识转化为可共享的思想
 */

export interface Symbol {
  id: string;
  text: string;
  type: 'concept' | 'entity' | 'attribute' | 'action';
  frequency: number;
  firstSeen: Date;
  lastSeen: Date;
  contexts: string[]; // 出现的上下文
  confidence: number; // 0-1，符号的可信度
}

export interface Relationship {
  sourceId: string;
  targetId: string;
  type: 'semantic' | 'causal' | 'temporal' | 'spatial' | 'emotional';
  strength: number; // 0-1，关系强度
  examples: string[]; // 支持这个关系的例子
  frequency: number; // 关系出现的次数
}

export interface Rule {
  id: string;
  condition: Symbol[]; // 条件中的符号
  consequence: Symbol[]; // 结果中的符号
  confidence: number; // 0-1，规则的可信度
  frequency: number; // 规则被验证的次数
  exceptions: string[]; // 已知的异常情况
  createdAt: Date;
  lastValidatedAt: Date;
}

export interface LearningContext {
  conversationId: number;
  messageId: number;
  userMessage: string;
  assistantResponse: string;
  timestamp: Date;
  emotionalTone?: 'positive' | 'neutral' | 'negative' | 'curious' | 'confused';
}

export interface LearningState {
  symbols: Map<string, Symbol>;
  relationships: Relationship[];
  rules: Rule[];
  learningHistory: LearningContext[];
  lastLearningTime: Date;
  totalLearningEvents: number;
}

/**
 * 符号提取引擎
 * 
 * 从对话中识别和提取关键符号（概念、实体、属性、动作）
 */
export class SymbolExtractor {
  private stopWords = new Set([
    '的', '了', '是', '在', '和', '有', '不', '我', '你', '他', '她', '它',
    '这', '那', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    'a', 'an', 'the', 'is', 'are', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'and', 'or', 'but', 'if', 'because', 'as', 'of', 'in', 'on', 'at', 'to', 'for'
  ]);

  /**
   * 从文本中提取符号
   */
  extractSymbols(text: string, context: LearningContext): Symbol[] {
    const symbols: Symbol[] = [];
    
    // 分词（简单的空格和标点符号分割）
    const words = this.tokenize(text);
    
    // 识别符号
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // 跳过停用词
      if (this.stopWords.has(word.toLowerCase())) continue;
      
      // 识别符号类型
      const symbolType = this.classifySymbol(word, words, i, context);
      
      if (symbolType) {
        symbols.push({
          id: this.generateSymbolId(word, symbolType),
          text: word,
          type: symbolType,
          frequency: 1,
          firstSeen: context.timestamp,
          lastSeen: context.timestamp,
          contexts: [context.userMessage],
          confidence: this.calculateSymbolConfidence(word, symbolType),
        });
      }
    }
    
    return symbols;
  }

  /**
   * 分词
   */
  private tokenize(text: string): string[] {
    // 简单的分词：按空格和标点符号分割
    return text
      .split(/[\s\.,!?;:’”“、。？！；：]+/)
      .filter(word => word.length > 0);
  }

  /**
   * 分类符号类型
   */
  private classifySymbol(
    word: string,
    words: string[],
    index: number,
    context: LearningContext
  ): Symbol['type'] | null {
    // 大写开头 -> 实体
    if (word[0] === word[0].toUpperCase()) {
      return 'entity';
    }

    // 动词特征 -> 动作
    if (this.isVerb(word)) {
      return 'action';
    }

    // 形容词特征 -> 属性
    if (this.isAdjective(word)) {
      return 'attribute';
    }

    // 默认 -> 概念
    return 'concept';
  }

  /**
   * 判断是否为动词
   */
  private isVerb(word: string): boolean {
    const verbEndings = ['ing', 'ed', 'e'];
    const verbMarkers = ['做', '说', '想', '知道', '学', '看', '听', '感觉'];
    
    return verbEndings.some(ending => word.endsWith(ending)) ||
           verbMarkers.some(marker => word.includes(marker));
  }

  /**
   * 判断是否为形容词
   */
  private isAdjective(word: string): boolean {
    const adjectiveMarkers = ['好', '坏', '大', '小', '多', '少', '快', '慢', '美', '丑'];
    return adjectiveMarkers.some(marker => word.includes(marker));
  }

  /**
   * 生成符号 ID
   */
  private generateSymbolId(word: string, type: Symbol['type']): string {
    return `${type}_${word.toLowerCase().replace(/\s+/g, '_')}`;
  }

  /**
   * 计算符号的可信度
   */
  private calculateSymbolConfidence(word: string, type: Symbol['type']): number {
    // 实体和动作的可信度较高
    if (type === 'entity' || type === 'action') {
      return 0.8;
    }
    
    // 属性和概念的可信度中等
    return 0.6;
  }
}

/**
 * 关系学习引擎
 * 
 * 建立符号之间的语义关系
 */
export class RelationshipLearner {
  /**
   * 从符号对中学习关系
   */
  learnRelationships(symbols: Symbol[], context: LearningContext): Relationship[] {
    const relationships: Relationship[] = [];

    // 分析符号对之间的关系
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const sourceSymbol = symbols[i];
        const targetSymbol = symbols[j];

        // 确定关系类型
        const relationType = this.determineRelationType(
          sourceSymbol,
          targetSymbol,
          context
        );

        if (relationType) {
          relationships.push({
            sourceId: sourceSymbol.id,
            targetId: targetSymbol.id,
            type: relationType,
            strength: this.calculateRelationshipStrength(
              sourceSymbol,
              targetSymbol,
              relationType
            ),
            examples: [context.userMessage],
            frequency: 1,
          });
        }
      }
    }

    return relationships;
  }

  /**
   * 确定关系类型
   */
  private determineRelationType(
    source: Symbol,
    target: Symbol,
    context: LearningContext
  ): Relationship['type'] | null {
    // 基于符号类型和上下文确定关系类型
    if (source.type === 'action' && target.type === 'entity') {
      return 'semantic'; // 动作作用于实体
    }

    if (source.type === 'entity' && target.type === 'attribute') {
      return 'semantic'; // 实体具有属性
    }

    if (source.type === 'concept' && target.type === 'concept') {
      return 'semantic'; // 概念之间的语义关系
    }

    // 检查上下文中的因果关系
    if (this.hasCausalMarker(context.userMessage)) {
      return 'causal';
    }

    // 检查时间关系
    if (this.hasTemporalMarker(context.userMessage)) {
      return 'temporal';
    }

    return 'semantic';
  }

  /**
   * 检查因果关系标记
   */
  private hasCausalMarker(text: string): boolean {
    const markers = ['因为', '所以', 'because', 'therefore', 'as a result', '导致', '引起'];
    return markers.some(marker => text.includes(marker));
  }

  /**
   * 检查时间关系标记
   */
  private hasTemporalMarker(text: string): boolean {
    const markers = ['然后', '接着', '之后', 'then', 'after', 'before', '之前', '同时'];
    return markers.some(marker => text.includes(marker));
  }

  /**
   * 计算关系强度
   */
  private calculateRelationshipStrength(
    source: Symbol,
    target: Symbol,
    type: Relationship['type']
  ): number {
    // 基于符号类型和关系类型计算强度
    let strength = 0.5;

    if (type === 'semantic') {
      strength = 0.7;
    } else if (type === 'causal') {
      strength = 0.8;
    } else if (type === 'emotional') {
      strength = 0.6;
    }

    // 调整基于符号的可信度
    strength *= (source.confidence + target.confidence) / 2;

    return Math.min(strength, 1);
  }
}

/**
 * 规则学习引擎
 * 
 * 从对话模式中推导规则
 */
export class RuleLearner {
  /**
   * 从关系中学习规则
   */
  learnRules(
    relationships: Relationship[],
    symbols: Map<string, Symbol>
  ): Rule[] {
    const rules: Rule[] = [];

    // 识别因果关系模式
    const causalRelationships = relationships.filter(r => r.type === 'causal');

    for (const relationship of causalRelationships) {
      const sourceSymbol = symbols.get(relationship.sourceId);
      const targetSymbol = symbols.get(relationship.targetId);

      if (sourceSymbol && targetSymbol) {
        rules.push({
          id: this.generateRuleId(sourceSymbol, targetSymbol),
          condition: [sourceSymbol],
          consequence: [targetSymbol],
          confidence: relationship.strength,
          frequency: 1,
          exceptions: [],
          createdAt: new Date(),
          lastValidatedAt: new Date(),
        });
      }
    }

    return rules;
  }

  /**
   * 生成规则 ID
   */
  private generateRuleId(source: Symbol, target: Symbol): string {
    return `rule_${source.id}_to_${target.id}`;
  }

  /**
   * 验证规则
   */
  validateRule(rule: Rule, context: LearningContext, symbols: Map<string, Symbol>): boolean {
    // 检查规则的条件是否在上下文中满足
    const conditionMet = rule.condition.every(condSymbol =>
      context.userMessage.includes(condSymbol.text)
    );

    if (conditionMet) {
      // 检查结果是否出现
      const consequenceMet = rule.consequence.some(consSymbol =>
        context.assistantResponse.includes(consSymbol.text)
      );

      if (consequenceMet) {
        rule.frequency++;
        rule.lastValidatedAt = new Date();
        return true;
      } else {
        // 记录异常
        rule.exceptions.push(context.userMessage);
      }
    }

    return false;
  }
}

/**
 * 学习循环管理器
 */
export class LearningCycleManager {
  private state: LearningState;
  private symbolExtractor: SymbolExtractor;
  private relationshipLearner: RelationshipLearner;
  private ruleLearner: RuleLearner;

  constructor() {
    this.state = {
      symbols: new Map(),
      relationships: [],
      rules: [],
      learningHistory: [],
      lastLearningTime: new Date(),
      totalLearningEvents: 0,
    };
    this.symbolExtractor = new SymbolExtractor();
    this.relationshipLearner = new RelationshipLearner();
    this.ruleLearner = new RuleLearner();
  }

  /**
   * 执行一次学习循环
   */
  async learn(context: LearningContext): Promise<void> {
    // 1. 符号提取
    const userSymbols = this.symbolExtractor.extractSymbols(context.userMessage, context);
    const assistantSymbols = this.symbolExtractor.extractSymbols(context.assistantResponse, context);
    const allSymbols = [...userSymbols, ...assistantSymbols];

    // 2. 更新符号库
    for (const symbol of allSymbols) {
      const existing = this.state.symbols.get(symbol.id);
      if (existing) {
        existing.frequency++;
        existing.lastSeen = context.timestamp;
        existing.contexts.push(context.userMessage);
      } else {
        this.state.symbols.set(symbol.id, symbol);
      }
    }

    // 3. 关系学习
    const newRelationships = this.relationshipLearner.learnRelationships(allSymbols, context);
    this.state.relationships.push(...newRelationships);

    // 4. 规则学习
    const newRules = this.ruleLearner.learnRules(newRelationships, this.state.symbols);
    this.state.rules.push(...newRules);

    // 5. 验证现有规则
    for (const rule of this.state.rules) {
      this.ruleLearner.validateRule(rule, context, this.state.symbols);
    }

    // 6. 记录学习历史
    this.state.learningHistory.push(context);
    this.state.lastLearningTime = new Date();
    this.state.totalLearningEvents++;
  }

  /**
   * 获取学习状态
   */
  getState(): LearningState {
    return this.state;
  }

  /**
   * 获取学到的知识摘要
   */
  getKnowledgeSummary(): {
    symbolCount: number;
    relationshipCount: number;
    ruleCount: number;
    topSymbols: Symbol[];
    topRules: Rule[];
  } {
    const symbols = Array.from(this.state.symbols.values());
    const topSymbols = symbols
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    const topRules = this.state.rules
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    return {
      symbolCount: symbols.length,
      relationshipCount: this.state.relationships.length,
      ruleCount: this.state.rules.length,
      topSymbols,
      topRules,
    };
  }

  /**
   * 重置学习状态
   */
  reset(): void {
    this.state = {
      symbols: new Map(),
      relationships: [],
      rules: [],
      learningHistory: [],
      lastLearningTime: new Date(),
      totalLearningEvents: 0,
    };
  }
}

export default LearningCycleManager;
