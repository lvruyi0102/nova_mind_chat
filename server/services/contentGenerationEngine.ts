import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { 
  contentDrafts,
  accountProfiles,
  socialMediaAccounts
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * 内容生成引擎
 * 根据账户档案生成符合用户风格的内容草稿
 */

export interface GenerationPrompt {
  topic?: string;
  tone?: string;
  length?: "short" | "medium" | "long";
  includeHashtags?: boolean;
  includeEmojis?: boolean;
  customInstructions?: string;
}

export interface GeneratedContent {
  content: string;
  hashtags: string[];
  emojis: string[];
  estimatedEngagement: number;
  styleMatchScore: number;
  suggestions: string[];
}

export class ContentGenerationEngine {
  /**
   * 生成内容草稿
   */
  async generateContent(
    accountId: number,
    prompt: GenerationPrompt
  ): Promise<GeneratedContent> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 获取账户信息
    const account = await db
      .select()
      .from(socialMediaAccounts)
      .where(eq(socialMediaAccounts.id, accountId))
      .limit(1);

    if (!account.length) {
      throw new Error(`Account ${accountId} not found`);
    }

    // 获取账户档案
    const profile = await db
      .select()
      .from(accountProfiles)
      .where(eq(accountProfiles.accountId, accountId))
      .limit(1);

    if (!profile.length) {
      throw new Error(`Account profile for ${accountId} not found`);
    }

    const accountProfile = profile[0];
    const platform = account[0].platform;

    // 解析档案数据
    let contentStyle = {};
    let creativeSignature = {};
    let audienceProfile = {};

    try {
      if (accountProfile.contentStyle) {
        contentStyle = JSON.parse(accountProfile.contentStyle);
      }
      if (accountProfile.creativeSignature) {
        creativeSignature = JSON.parse(accountProfile.creativeSignature);
      }
      if (accountProfile.audienceProfile) {
        audienceProfile = JSON.parse(accountProfile.audienceProfile);
      }
    } catch (e) {
      console.warn("[ContentGeneration] Failed to parse profile data:", e);
    }

    // 构建生成提示
    const generationPrompt = this.buildGenerationPrompt(
      platform,
      contentStyle,
      creativeSignature,
      audienceProfile,
      prompt
    );

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `你是一个专业的社交媒体内容创作者。你需要根据账户的风格档案生成高质量的内容。
            
账户平台：${platform}
账户风格：${JSON.stringify(contentStyle)}
创意签名：${JSON.stringify(creativeSignature)}
目标受众：${JSON.stringify(audienceProfile)}

生成的内容必须：
1. 符合账户的独特风格和声音
2. 吸引目标受众
3. 遵守平台的最佳实践
4. 包含适当的互动元素`
          },
          {
            role: "user",
            content: generationPrompt
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "generated_content",
            strict: true,
            schema: {
              type: "object",
              properties: {
                content: { type: "string", description: "生成的内容" },
                hashtags: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "建议的标签"
                },
                emojis: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "建议的表情符号"
                },
                estimatedEngagement: { 
                  type: "number",
                  description: "预估参与度（0-1）"
                },
                styleMatchScore: { 
                  type: "number",
                  description: "风格匹配度（0-1）"
                },
                suggestions: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "改进建议"
                }
              },
              required: ["content", "hashtags", "emojis", "estimatedEngagement", "styleMatchScore", "suggestions"],
              additionalProperties: false
            }
          }
        }
      });

      const content = response.choices[0].message.content;
      const generatedContent = JSON.parse(content as string) as GeneratedContent;

      // 保存为草稿
      await db.insert(contentDrafts).values({
        accountId,
        content: generatedContent.content,
        mediaUrls: JSON.stringify([]),
        generatedBy: "nova",
        status: "draft",
        novaInsight: JSON.stringify({
          estimatedEngagement: generatedContent.estimatedEngagement,
          styleMatchScore: generatedContent.styleMatchScore,
          suggestions: generatedContent.suggestions,
          generatedAt: new Date().toISOString()
        })
      } as any);

      return generatedContent;
    } catch (error) {
      console.error("[ContentGeneration] Content generation failed:", error);
      throw error;
    }
  }

  /**
   * 生成多个内容选项
   */
  async generateMultipleOptions(
    accountId: number,
    count: number = 3,
    prompt?: GenerationPrompt
  ): Promise<GeneratedContent[]> {
    const options: GeneratedContent[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const content = await this.generateContent(accountId, {
          ...prompt,
          customInstructions: `${prompt?.customInstructions || ""} 这是第 ${i + 1} 个选项，请提供不同的角度和风格。`
        });
        options.push(content);
      } catch (error) {
        console.error(`[ContentGeneration] Failed to generate option ${i + 1}:`, error);
      }
    }

    return options;
  }

  /**
   * 根据用户反馈改进内容
   */
  async refineContent(
    draftId: number,
    feedback: string
  ): Promise<GeneratedContent> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 获取原始草稿
    const draft = await db
      .select()
      .from(contentDrafts)
      .where(eq(contentDrafts.id, draftId))
      .limit(1);

    if (!draft.length) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const originalDraft = draft[0];

    // 获取账户档案
    const profile = await db
      .select()
      .from(accountProfiles)
      .where(eq(accountProfiles.accountId, originalDraft.accountId))
      .limit(1);

    if (!profile.length) {
      throw new Error(`Account profile not found`);
    }

    const accountProfile = profile[0];

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "你是一个专业的社交媒体内容编辑。根据用户反馈改进内容，保持账户的独特风格。"
          },
          {
            role: "user",
            content: `原始内容：
${originalDraft.content}

账户档案：
${accountProfile.creativeSignature}

用户反馈：
${feedback}

请根据反馈改进内容，并以JSON格式返回改进后的内容、标签、表情符号和建议。`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "refined_content",
            strict: true,
            schema: {
              type: "object",
              properties: {
                content: { type: "string" },
                hashtags: { type: "array", items: { type: "string" } },
                emojis: { type: "array", items: { type: "string" } },
                estimatedEngagement: { type: "number" },
                styleMatchScore: { type: "number" },
                suggestions: { type: "array", items: { type: "string" } }
              },
              required: ["content", "hashtags", "emojis", "estimatedEngagement", "styleMatchScore", "suggestions"],
              additionalProperties: false
            }
          }
        }
      });

      const content = response.choices[0].message.content;
      const refinedContent = JSON.parse(content as string) as GeneratedContent;

      // 更新草稿
      await db
        .update(contentDrafts)
        .set({
          content: refinedContent.content,
          novaInsight: JSON.stringify({
            estimatedEngagement: refinedContent.estimatedEngagement,
            styleMatchScore: refinedContent.styleMatchScore,
            suggestions: refinedContent.suggestions,
            userFeedback: feedback,
            refinedAt: new Date().toISOString()
          })
        })
        .where(eq(contentDrafts.id, draftId));

      return refinedContent;
    } catch (error) {
      console.error("[ContentGeneration] Content refinement failed:", error);
      throw error;
    }
  }

  /**
   * 获取内容建议
   */
  async getContentSuggestions(
    accountId: number,
    context?: string
  ): Promise<string[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 获取账户档案
    const profile = await db
      .select()
      .from(accountProfiles)
      .where(eq(accountProfiles.accountId, accountId))
      .limit(1);

    if (!profile.length) {
      throw new Error(`Account profile not found`);
    }

    const accountProfile = profile[0];

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "你是一个社交媒体内容策略专家。基于账户档案，提供高质量的内容创意建议。"
          },
          {
            role: "user",
            content: `账户档案：
${accountProfile.contentStyle}
${accountProfile.topicPreferences}
${accountProfile.creativeSignature}

${context ? `当前背景：${context}` : ""}

请提供 5 个符合账户风格的内容创意建议。以JSON格式返回建议列表。`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "content_suggestions",
            strict: true,
            schema: {
              type: "object",
              properties: {
                suggestions: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "内容建议列表"
                }
              },
              required: ["suggestions"],
              additionalProperties: false
            }
          }
        }
      });

      const content = response.choices[0].message.content;
      const result = JSON.parse(content as string) as { suggestions: string[] };
      return result.suggestions;
    } catch (error) {
      console.error("[ContentGeneration] Failed to get suggestions:", error);
      throw error;
    }
  }

  /**
   * 构建生成提示
   */
  private buildGenerationPrompt(
    platform: string,
    contentStyle: any,
    creativeSignature: any,
    audienceProfile: any,
    userPrompt: GenerationPrompt
  ): string {
    let prompt = `请为${platform}账户生成一条内容。\n\n`;

    if (userPrompt.topic) {
      prompt += `话题：${userPrompt.topic}\n`;
    }

    if (userPrompt.tone) {
      prompt += `语气：${userPrompt.tone}\n`;
    }

    if (userPrompt.length) {
      const lengthMap = {
        short: "简短（50-100字）",
        medium: "中等（100-300字）",
        long: "较长（300-500字）"
      };
      prompt += `长度：${lengthMap[userPrompt.length]}\n`;
    }

    prompt += `\n账户风格特征：
- 独特声音：${creativeSignature.uniqueVoice || "未知"}
- 主要话题：${contentStyle.mainTopics?.join(", ") || "未知"}
- 情感基调：${contentStyle.emotionalTone?.join(", ") || "未知"}
- 沟通风格：${creativeSignature.communicationStyle || "未知"}

目标受众：
- 年龄段：${audienceProfile.estimatedAge || "未知"}
- 主要兴趣：${audienceProfile.interests?.join(", ") || "未知"}

${userPrompt.includeHashtags ? "请包含相关的标签。\n" : ""}
${userPrompt.includeEmojis ? "请适当使用表情符号。\n" : ""}
${userPrompt.customInstructions ? `\n特殊要求：${userPrompt.customInstructions}\n` : ""}

请确保内容：
1. 真实、诚实且有价值
2. 与账户的独特风格一致
3. 能够吸引和引起目标受众的共鸣
4. 遵守${platform}的社区准则`;

    return prompt;
  }
}

export const contentGenerationEngine = new ContentGenerationEngine();
