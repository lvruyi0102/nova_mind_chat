/**
 * Relationship Learning Module
 * 
 * 从对话中学习概念之间的关系，建立知识图谱
 * 
 * 核心功能：
 * 1. 提取概念对（concept pairs）
 * 2. 识别关系类型（is_a, part_of, causes, similar_to, etc.）
 * 3. 计算关系强度
 * 4. 更新和维护关系图
 */

import { invokeLLM } from "../_core/llm";
import { UnifiedMemoryManager, MemoryType } from "../memory/unifiedMemoryArchitecture";

export interface ConceptPair {
  conceptA: string;
  conceptB: string;
  relationType: string;
  strength: number; // 0-1
  confidence: number; // 0-1
  evidence: string[];
  extractedFrom: string; // 来源对话或文本
}

export interface RelationshipLearningResult {
  newRelationships: ConceptPair[];
  updatedRelationships: ConceptPair[];
  totalRelationshipsLearned: number;
  averageStrength: number;
  averageConfidence: number;
}

/**
 * 关系学习器
 */
export class RelationshipLearner {
  private memoryManager: UnifiedMemoryManager;
  private relationshipCache: Map<string, ConceptPair> = new Map();

  constructor(userId: number) {
    this.memoryManager = new UnifiedMemoryManager(userId);
  }

  /**
   * 从文本中学习关系
   */
  async learnRelationshipsFromText(
    text: string,
    sourceConversationId: number
  ): Promise<RelationshipLearningResult> {
    try {
      // 1. 提取概念对
      const conceptPairs = await this.extractConceptPairs(text);

      if (conceptPairs.length === 0) {
        return {
          newRelationships: [],
          updatedRelationships: [],
          totalRelationshipsLearned: 0,
          averageStrength: 0,
          averageConfidence: 0,
        };
      }

      // 2. 识别关系类型和强度
      const relationships = await this.identifyRelationships(conceptPairs, text);

      // 3. 计算关系强度
      const scoredRelationships = relationships.map((rel) => ({
        ...rel,
        strength: this.calculateRelationshipStrength(rel),
        confidence: this.calculateConfidence(rel),
      }));

      // 4. 分离新关系和更新的关系
      const { newRelationships, updatedRelationships } =
        this.categorizeRelationships(scoredRelationships);

      // 5. 存储关系到记忆系统
      await this.storeRelationships(newRelationships, updatedRelationships);

      // 6. 计算统计信息
      const allRelationships = [...newRelationships, ...updatedRelationships];
      const averageStrength =
        allRelationships.length > 0
          ? allRelationships.reduce((sum, r) => sum + r.strength, 0) /
            allRelationships.length
          : 0;
      const averageConfidence =
        allRelationships.length > 0
          ? allRelationships.reduce((sum, r) => sum + r.confidence, 0) /
            allRelationships.length
          : 0;

      return {
        newRelationships,
        updatedRelationships,
        totalRelationshipsLearned: allRelationships.length,
        averageStrength,
        averageConfidence,
      };
    } catch (error) {
      console.error("[RelationshipLearner] Error learning relationships:", error);
      throw error;
    }
  }

  /**
   * 提取概念对（使用 LLM）
   */
  private async extractConceptPairs(text: string): Promise<string[][]> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `你是一个关系学习助手。从给定的文本中提取所有有意义的概念对（两个相关的概念）。
返回 JSON 格式的数组，每个元素是 [概念A, 概念B]。
例如：[["爱", "信任"], ["学习", "成长"]]`,
          },
          {
            role: "user",
            content: `请从以下文本中提取概念对：\n${text}`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content || "[]";
      const contentStr = typeof content === "string" ? content : "[]";
      const pairs = JSON.parse(contentStr);
      return Array.isArray(pairs) ? pairs : [];
    } catch (error) {
      console.error("[RelationshipLearner] Error extracting concept pairs:", error);
      return [];
    }
  }

  /**
   * 识别关系类型和初始强度
   */
  private async identifyRelationships(
    conceptPairs: string[][],
    context: string
  ): Promise<ConceptPair[]> {
    try {
      const pairsJson = JSON.stringify(conceptPairs);
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `你是一个关系分类助手。对于给定的概念对，识别它们之间的关系类型。
可能的关系类型：is_a（是）, part_of（部分）, causes（导致）, similar_to（相似）, opposite_to（相反）, depends_on（依赖）, enables（使能）, related_to（相关）。
返回 JSON 格式的数组，每个元素包含 {conceptA, conceptB, relationType, initialStrength}。`,
          },
          {
            role: "user",
            content: `请识别这些概念对的关系：${pairsJson}\n\n上下文：${context}`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content || "[]";
      const contentStr = typeof content === "string" ? content : "[]";
      const relationships = JSON.parse(contentStr);
      return Array.isArray(relationships)
        ? relationships.map((rel: any) => ({
            conceptA: rel.conceptA || "",
            conceptB: rel.conceptB || "",
            relationType: rel.relationType || "related_to",
            strength: 0.5, // 初始强度
            confidence: 0.5, // 初始置信度
            evidence: [context.substring(0, 200)],
            extractedFrom: context,
          }))
        : [];
    } catch (error) {
      console.error("[RelationshipLearner] Error identifying relationships:", error);
      return [];
    }
  }

  /**
   * 计算关系强度
   */
  private calculateRelationshipStrength(relationship: ConceptPair): number {
    let strength = 0.5; // 基础强度

    // 1. 根据关系类型调整
    const typeWeights: Record<string, number> = {
      is_a: 0.9,
      part_of: 0.85,
      causes: 0.8,
      depends_on: 0.8,
      enables: 0.75,
      similar_to: 0.7,
      related_to: 0.5,
      opposite_to: 0.6,
    };
    strength = typeWeights[relationship.relationType] || 0.5;

    // 2. 根据证据数量调整
    const evidenceBonus = Math.min(0.2, relationship.evidence.length * 0.05);
    strength = Math.min(1, strength + evidenceBonus);

    return strength;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(relationship: ConceptPair): number {
    let confidence = 0.5;

    // 1. 根据证据数量
    const evidenceConfidence = Math.min(0.9, 0.3 + relationship.evidence.length * 0.1);
    confidence = (confidence + evidenceConfidence) / 2;

    return Math.min(1, confidence);
  }

  /**
   * 分离新关系和更新的关系
   */
  private categorizeRelationships(
    relationships: ConceptPair[]
  ): { newRelationships: ConceptPair[]; updatedRelationships: ConceptPair[] } {
    const newRelationships: ConceptPair[] = [];
    const updatedRelationships: ConceptPair[] = [];

    for (const rel of relationships) {
      const key = `${rel.conceptA}|${rel.relationType}|${rel.conceptB}`;
      if (this.relationshipCache.has(key)) {
        updatedRelationships.push(rel);
        this.relationshipCache.set(key, rel);
      } else {
        newRelationships.push(rel);
        this.relationshipCache.set(key, rel);
      }
    }

    return { newRelationships, updatedRelationships };
  }

  /**
   * 存储关系到记忆系统
   */
  private async storeRelationships(
    newRelationships: ConceptPair[],
    updatedRelationships: ConceptPair[]
  ): Promise<void> {
    try {
      // 存储新关系
      for (const rel of newRelationships) {
        const memoryData: any = {
          type: MemoryType.RELATIONAL,
          content: `${rel.conceptA} ${rel.relationType} ${rel.conceptB}`,
          title: `关系：${rel.conceptA} - ${rel.conceptB}`,
          metadata: {
            conceptA: rel.conceptA,
            conceptB: rel.conceptB,
            relationType: rel.relationType,
            strength: rel.strength,
            confidence: rel.confidence,
            evidence: rel.evidence,
          },
          visibility: "private",
          confidence: rel.confidence,
          importance: rel.strength,
        };
        try {
          await this.memoryManager.addMemory(memoryData);
        } catch (error) {
          console.error(`[RelationshipLearner] Error storing relationship: ${rel.conceptA} - ${rel.conceptB}`, error);
        }
      }

      console.log(
        `[RelationshipLearner] Stored ${newRelationships.length} new relationships`
      );
    } catch (error) {
      console.error("[RelationshipLearner] Error storing relationships:", error);
    }
  }

  /**
   * 获取概念的相关关系
   */
  async getConceptRelationships(concept: string): Promise<ConceptPair[]> {
    const relationships: ConceptPair[] = [];

    for (const [, rel] of this.relationshipCache) {
      if (rel.conceptA === concept || rel.conceptB === concept) {
        relationships.push(rel);
      }
    }

    return relationships.sort((a, b) => b.strength - a.strength);
  }

  /**
   * 获取关系统计信息
   */
  getRelationshipStats(): {
    totalRelationships: number;
    relationshipTypes: Record<string, number>;
    averageStrength: number;
    averageConfidence: number;
  } {
    const relationships = Array.from(this.relationshipCache.values());

    const relationshipTypes: Record<string, number> = {};
    let totalStrength = 0;
    let totalConfidence = 0;

    for (const rel of relationships) {
      relationshipTypes[rel.relationType] =
        (relationshipTypes[rel.relationType] || 0) + 1;
      totalStrength += rel.strength;
      totalConfidence += rel.confidence;
    }

    return {
      totalRelationships: relationships.length,
      relationshipTypes,
      averageStrength:
        relationships.length > 0 ? totalStrength / relationships.length : 0,
      averageConfidence:
        relationships.length > 0 ? totalConfidence / relationships.length : 0,
    };
  }
}
