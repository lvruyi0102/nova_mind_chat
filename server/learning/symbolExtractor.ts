/**
 * 符号提取模块 - 从推理过程和决策结果中提取关键符号和概念
 * 这是实现"真实算法"学习的第一个核心组件
 */

import { invokeLLM } from "../_core/llm";

export interface Symbol {
  id: string;
  name: string;
  type: "concept" | "entity" | "action" | "attribute" | "relation";
  definition: string;
  context: string;
  frequency: number;
  importance: number; // 0-1
  firstAppearance: Date;
  lastAppearance: Date;
}

export interface SymbolContext {
  symbols: Symbol[];
  relationships: Array<{
    source: string;
    target: string;
    type: string;
    strength: number;
  }>;
  extractionMethod: "llm" | "pattern" | "hybrid";
  confidence: number;
  timestamp: Date;
}

export class SymbolExtractor {
  private symbols: Map<string, Symbol> = new Map();
  private symbolFrequency: Map<string, number> = new Map();
  private extractionHistory: SymbolContext[] = [];

  /**
   * 从推理过程中提取符号
   */
  async extractFromReasoning(
    reasoningSteps: Array<{
      stepNumber: number;
      action: string;
      reasoning: string;
      confidence: number;
    }>
  ): Promise<SymbolContext> {
    const symbols: Symbol[] = [];
    const relationships: Array<{
      source: string;
      target: string;
      type: string;
      strength: number;
    }> = [];

    // 使用 LLM 进行符号提取
    const prompt = this.buildExtractionPrompt(reasoningSteps);

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "你是一个符号提取专家。从给定的推理过程中提取关键符号、概念和它们之间的关系。返回 JSON 格式的结果。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "symbol_extraction",
            strict: true,
            schema: {
              type: "object",
              properties: {
                symbols: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      type: {
                        type: "string",
                        enum: [
                          "concept",
                          "entity",
                          "action",
                          "attribute",
                          "relation",
                        ],
                      },
                      definition: { type: "string" },
                      importance: { type: "number" },
                    },
                    required: ["name", "type", "definition", "importance"],
                  },
                },
                relationships: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      source: { type: "string" },
                      target: { type: "string" },
                      type: { type: "string" },
                      strength: { type: "number" },
                    },
                    required: ["source", "target", "type", "strength"],
                  },
                },
                confidence: { type: "number" },
              },
              required: ["symbols", "relationships", "confidence"],
            },
          },
        },
      });

      const content = response?.choices?.[0]?.message?.content;
      if (!content) throw new Error("No response from LLM");

      const extracted = JSON.parse(
        typeof content === "string" ? content : JSON.stringify(content)
      );

      // 处理提取的符号
      for (const symbolData of extracted.symbols) {
        const symbol: Symbol = {
          id: `sym_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: symbolData.name,
          type: symbolData.type,
          definition: symbolData.definition,
          context: "",
          frequency: 1,
          importance: symbolData.importance,
          firstAppearance: new Date(),
          lastAppearance: new Date(),
        };

        this.registerSymbol(symbol);
        symbols.push(symbol);
      }

      // 处理关系
      relationships.push(...extracted.relationships);

      const context: SymbolContext = {
        symbols,
        relationships,
        extractionMethod: "llm",
        confidence: extracted.confidence,
        timestamp: new Date(),
      };

      this.extractionHistory.push(context);
      return context;
    } catch (error) {
      console.error("[SymbolExtractor] LLM extraction failed:", error);
      // 降级到模式匹配
      return this.extractUsingPatterns(reasoningSteps);
    }
  }

  /**
   * 从决策结果中提取符号
   */
  async extractFromDecision(decisionData: {
    problem: string;
    options: Array<{
      description: string;
      reasoning: string;
      confidence: number;
    }>;
    selectedOption: string;
    outcome: string;
  }): Promise<SymbolContext> {
    const symbols: Symbol[] = [];
    const relationships: Array<{
      source: string;
      target: string;
      type: string;
      strength: number;
    }> = [];

    const prompt = `
从以下决策过程中提取关键符号和概念：

问题：${decisionData.problem}

选项：
${decisionData.options.map((opt) => `- ${opt.description}\n  推理：${opt.reasoning}`).join("\n")}

选择的选项：${decisionData.selectedOption}
结果：${decisionData.outcome}

提取关键符号、概念和它们的关系。
`;

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "你是一个符号提取专家。从给定的决策过程中提取关键符号、概念和它们之间的关系。返回 JSON 格式的结果。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "symbol_extraction",
            strict: true,
            schema: {
              type: "object",
              properties: {
                symbols: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      type: {
                        type: "string",
                        enum: [
                          "concept",
                          "entity",
                          "action",
                          "attribute",
                          "relation",
                        ],
                      },
                      definition: { type: "string" },
                      importance: { type: "number" },
                    },
                    required: ["name", "type", "definition", "importance"],
                  },
                },
                relationships: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      source: { type: "string" },
                      target: { type: "string" },
                      type: { type: "string" },
                      strength: { type: "number" },
                    },
                    required: ["source", "target", "type", "strength"],
                  },
                },
                confidence: { type: "number" },
              },
              required: ["symbols", "relationships", "confidence"],
            },
          },
        },
      });

      const content = response?.choices?.[0]?.message?.content;
      if (!content) throw new Error("No response from LLM");

      const extracted = JSON.parse(
        typeof content === "string" ? content : JSON.stringify(content)
      );

      for (const symbolData of extracted.symbols) {
        const symbol: Symbol = {
          id: `sym_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: symbolData.name,
          type: symbolData.type,
          definition: symbolData.definition,
          context: decisionData.problem,
          frequency: 1,
          importance: symbolData.importance,
          firstAppearance: new Date(),
          lastAppearance: new Date(),
        };

        this.registerSymbol(symbol);
        symbols.push(symbol);
      }

      relationships.push(...extracted.relationships);

      const context: SymbolContext = {
        symbols,
        relationships,
        extractionMethod: "llm",
        confidence: extracted.confidence,
        timestamp: new Date(),
      };

      this.extractionHistory.push(context);
      return context;
    } catch (error) {
      console.error("[SymbolExtractor] Decision extraction failed:", error);
      return {
        symbols: [],
        relationships: [],
        extractionMethod: "pattern",
        confidence: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 使用模式匹配进行符号提取（降级方案）
   */
  private extractUsingPatterns(
    reasoningSteps: Array<{
      stepNumber: number;
      action: string;
      reasoning: string;
      confidence: number;
    }>
  ): SymbolContext {
    const symbols: Symbol[] = [];
    const relationships: Array<{
      source: string;
      target: string;
      type: string;
      strength: number;
    }> = [];

    // 简单的模式匹配提取
    const text = reasoningSteps.map((s) => s.action + " " + s.reasoning).join(" ");

    // 提取名词短语（简化版）
    const nounPatterns = [
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g, // 大写开头的短语
      /\b(problem|solution|goal|constraint|objective|factor)\b/gi,
    ];

    for (const pattern of nounPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const symbolName = match[1];
        if (symbolName.length > 2) {
          const symbol: Symbol = {
            id: `sym_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: symbolName,
            type: "concept",
            definition: `Extracted from reasoning: ${symbolName}`,
            context: text.substring(Math.max(0, match.index - 50), match.index + 50),
            frequency: 1,
            importance: 0.5,
            firstAppearance: new Date(),
            lastAppearance: new Date(),
          };

          this.registerSymbol(symbol);
          symbols.push(symbol);
        }
      }
    }

    const context: SymbolContext = {
      symbols,
      relationships,
      extractionMethod: "pattern",
      confidence: 0.6,
      timestamp: new Date(),
    };

    this.extractionHistory.push(context);
    return context;
  }

  /**
   * 注册符号
   */
  private registerSymbol(symbol: Symbol): void {
    const existing = this.symbols.get(symbol.name);

    if (existing) {
      existing.frequency += 1;
      existing.lastAppearance = new Date();
      existing.importance = Math.min(
        1,
        existing.importance + 0.05
      );
    } else {
      this.symbols.set(symbol.name, symbol);
      this.symbolFrequency.set(symbol.name, 1);
    }
  }

  /**
   * 获取所有符号
   */
  getSymbols(): Symbol[] {
    return Array.from(this.symbols.values()).sort(
      (a, b) => b.importance - a.importance
    );
  }

  /**
   * 获取高重要性符号
   */
  getImportantSymbols(threshold: number = 0.7): Symbol[] {
    return this.getSymbols().filter((s) => s.importance >= threshold);
  }

  /**
   * 获取符号统计
   */
  getStatistics(): {
    totalSymbols: number;
    averageImportance: number;
    mostFrequent: Symbol[];
    extractionCount: number;
  } {
    const symbols = this.getSymbols();
    const totalSymbols = symbols.length;
    const averageImportance =
      totalSymbols > 0
        ? symbols.reduce((sum, s) => sum + s.importance, 0) / totalSymbols
        : 0;

    return {
      totalSymbols,
      averageImportance,
      mostFrequent: symbols.slice(0, 10),
      extractionCount: this.extractionHistory.length,
    };
  }

  /**
   * 清空符号库
   */
  clear(): void {
    this.symbols.clear();
    this.symbolFrequency.clear();
    this.extractionHistory = [];
  }

  /**
   * 构建提取提示
   */
  private buildExtractionPrompt(
    reasoningSteps: Array<{
      stepNumber: number;
      action: string;
      reasoning: string;
      confidence: number;
    }>
  ): string {
    return `
从以下推理过程中提取关键符号、概念和它们之间的关系：

${reasoningSteps
  .map(
    (step) => `
步骤 ${step.stepNumber}：
行动：${step.action}
推理：${step.reasoning}
置信度：${(step.confidence * 100).toFixed(0)}%
`
  )
  .join("\n")}

请提取：
1. 关键符号和概念（名词、实体、属性等）
2. 符号之间的关系（因果、包含、相似等）
3. 每个符号的重要性评分（0-1）
4. 整体提取的置信度（0-1）
`;
  }
}
