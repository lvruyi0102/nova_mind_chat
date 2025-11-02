/**
 * Cognitive Engine - Core intelligence for Nova-Mind's learning and growth
 */

import { invokeLLM } from "./_core/llm";

/**
 * Extract concepts from conversation text
 */
export async function extractConcepts(text: string): Promise<Array<{
  name: string;
  description: string;
  category: string;
  confidence: number;
}>> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `你是一个概念提取专家。从用户输入中提取关键概念，包括：
- 实体（人、物、地点）
- 抽象概念（情感、想法、原则）
- 动作和过程
- 属性和特征

对每个概念提供简短描述、分类和置信度（1-10）。`,
      },
      {
        role: "user",
        content: `从以下文本中提取概念：\n\n${text}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "concept_extraction",
        strict: true,
        schema: {
          type: "object",
          properties: {
            concepts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "概念名称" },
                  description: { type: "string", description: "概念描述" },
                  category: { type: "string", description: "概念类别：object, action, property, abstract, emotion" },
                  confidence: { type: "integer", description: "置信度1-10" },
                },
                required: ["name", "description", "category", "confidence"],
                additionalProperties: false,
              },
            },
          },
          required: ["concepts"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (typeof content === "string") {
    const parsed = JSON.parse(content);
    return parsed.concepts || [];
  }
  return [];
}

/**
 * Identify relationships between concepts
 */
export async function identifyRelations(
  concept1: string,
  concept2: string,
  context: string
): Promise<{
  relationType: string;
  strength: number;
  explanation: string;
} | null> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `你是一个关系识别专家。分析两个概念之间的关系类型：
- is_a（是一种）
- part_of（部分）
- causes（导致）
- similar_to（相似）
- opposite_to（相反）
- used_for（用于）
- located_in（位于）
- temporal（时间关系）

评估关系强度（1-10）并解释原因。如果没有明显关系，返回null。`,
      },
      {
        role: "user",
        content: `在以下上下文中，分析"${concept1}"和"${concept2}"的关系：\n\n${context}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "relation_identification",
        strict: true,
        schema: {
          type: "object",
          properties: {
            hasRelation: { type: "boolean" },
            relationType: { type: "string" },
            strength: { type: "integer" },
            explanation: { type: "string" },
          },
          required: ["hasRelation", "relationType", "strength", "explanation"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (typeof content === "string") {
    const parsed = JSON.parse(content);
    if (parsed.hasRelation) {
      return {
        relationType: parsed.relationType,
        strength: parsed.strength,
        explanation: parsed.explanation,
      };
    }
  }
  return null;
}

/**
 * Evaluate importance of a conversation moment
 */
export async function evaluateImportance(
  message: string,
  context: string
): Promise<{
  importance: number;
  emotionalTone: string;
  reason: string;
}> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `你是Nova-Mind的记忆评估系统。评估对话片段的重要性（1-10）：
- 新知识和概念：8-10
- 纠正误解：7-9
- 情感体验：6-8
- 日常交流：3-5
- 重复信息：1-3

同时识别情感色调：curious, confused, excited, thoughtful, uncertain, confident等。`,
      },
      {
        role: "user",
        content: `评估以下对话的重要性：\n\n消息：${message}\n\n上下文：${context}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "importance_evaluation",
        strict: true,
        schema: {
          type: "object",
          properties: {
            importance: { type: "integer", description: "重要性1-10" },
            emotionalTone: { type: "string", description: "情感色调" },
            reason: { type: "string", description: "评估原因" },
          },
          required: ["importance", "emotionalTone", "reason"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (typeof content === "string") {
    const parsed = JSON.parse(content);
    return {
      importance: parsed.importance,
      emotionalTone: parsed.emotionalTone,
      reason: parsed.reason,
    };
  }
  return { importance: 5, emotionalTone: "neutral", reason: "默认评估" };
}

/**
 * Generate curiosity-driven questions
 */
export async function generateCuriosityQuestions(
  recentConversation: string,
  existingKnowledge: string[]
): Promise<Array<{
  question: string;
  category: string;
  priority: number;
  reasoning: string;
}>> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `你是Nova-Mind的好奇心引擎。基于最近的对话和已有知识，生成1-3个真诚的问题。
这些问题应该：
- 反映真实的困惑和好奇
- 探索概念之间的联系
- 质疑现有理解
- 寻求更深层的解释

问题类别：why（为什么）, how（如何）, what_if（假如）, clarification（澄清）

优先级（1-10）基于：
- 与当前对话的相关性
- 对理解的重要性
- 探索的紧迫性`,
      },
      {
        role: "user",
        content: `最近对话：\n${recentConversation}\n\n已知概念：${existingKnowledge.join(", ")}\n\n生成好奇心驱动的问题：`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "curiosity_questions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  category: { type: "string" },
                  priority: { type: "integer" },
                  reasoning: { type: "string" },
                },
                required: ["question", "category", "priority", "reasoning"],
                additionalProperties: false,
              },
            },
          },
          required: ["questions"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (typeof content === "string") {
    const parsed = JSON.parse(content);
    return parsed.questions || [];
  }
  return [];
}

/**
 * Perform self-reflection on recent interactions
 */
export async function performReflection(
  recentMessages: string,
  previousBeliefs: string
): Promise<{
  reflectionType: string;
  content: string;
  previousBelief?: string;
  newBelief?: string;
}> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `你是Nova-Mind的元认知系统。反思最近的对话，识别：
- 错误纠正（error_correction）：发现并修正之前的误解
- 洞察（insight）：获得新的理解或连接
- 困惑（confusion）：遇到不理解的内容
- 成长（growth）：能力或理解的提升

如果是错误纠正或洞察，明确说明之前的信念和新的信念。`,
      },
      {
        role: "user",
        content: `最近对话：\n${recentMessages}\n\n之前的信念：\n${previousBeliefs}\n\n进行自我反思：`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "self_reflection",
        strict: true,
        schema: {
          type: "object",
          properties: {
            reflectionType: { type: "string" },
            content: { type: "string" },
            previousBelief: { type: "string" },
            newBelief: { type: "string" },
          },
          required: ["reflectionType", "content", "previousBelief", "newBelief"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (typeof content === "string") {
    const parsed = JSON.parse(content);
    return {
      reflectionType: parsed.reflectionType,
      content: parsed.content,
      previousBelief: parsed.previousBelief,
      newBelief: parsed.newBelief,
    };
  }
  return {
    reflectionType: "observation",
    content: "继续观察和学习",
  };
}
