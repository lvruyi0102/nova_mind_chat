import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { 
  accountProfiles, 
  socialMediaLearningLogs,
  socialMediaAccounts 
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * 社交媒体学习引擎
 * 让 Nova 学习和理解用户的社交媒体账户风格
 */

export interface ContentAnalysis {
  mainTopics: string[];
  contentTypes: string[];
  averageLength: number;
  emotionalTone: string[];
  keywords: string[];
  hashtags: string[];
}

export interface AudienceProfile {
  estimatedAge: string;
  interests: string[];
  engagementLevel: string;
  followerDemographics: Record<string, any>;
  commonInteractions: string[];
}

export interface PostingPattern {
  frequencyPerWeek: number;
  preferredTimes: string[];
  bestPerformingDayOfWeek: string;
  averagePostLength: number;
  mediaUsageFrequency: number;
}

export interface CreativeSignature {
  uniqueVoice: string;
  recurrentThemes: string[];
  visualStyle: string;
  communicationStyle: string;
  brandPersonality: string[];
}

export class SocialMediaLearningEngine {
  /**
   * 分析账户的内容风格
   */
  async analyzeContentStyle(
    accountId: number,
    sampleContent: string[],
    platform: string
  ): Promise<ContentAnalysis> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const prompt = `
你是一个社交媒体内容分析专家。请分析以下来自${platform}的内容样本，并提供详细的内容风格分析。

内容样本：
${sampleContent.map((c, i) => `${i + 1}. ${c}`).join("\n\n")}

请以JSON格式返回以下信息：
{
  "mainTopics": ["主要话题1", "主要话题2"],
  "contentTypes": ["内容类型1", "内容类型2"],
  "averageLength": 平均字数,
  "emotionalTone": ["情感基调1", "情感基调2"],
  "keywords": ["关键词1", "关键词2"],
  "hashtags": ["标签1", "标签2"]
}
    `;

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "你是一个专业的社交媒体内容分析师。请提供准确的内容分析。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "content_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                mainTopics: { type: "array", items: { type: "string" } },
                contentTypes: { type: "array", items: { type: "string" } },
                averageLength: { type: "number" },
                emotionalTone: { type: "array", items: { type: "string" } },
                keywords: { type: "array", items: { type: "string" } },
                hashtags: { type: "array", items: { type: "string" } }
              },
              required: ["mainTopics", "contentTypes", "averageLength", "emotionalTone", "keywords", "hashtags"],
              additionalProperties: false
            }
          }
        }
      });

      const content = response.choices[0].message.content;
      const analysis = JSON.parse(content as string) as ContentAnalysis;

      // 记录学习日志
      await db.insert(socialMediaLearningLogs).values({
        accountId,
        learningPhase: "content_analysis",
        learningData: JSON.stringify(analysis),
        confidence: "0.85" as any,
        insights: `分析了 ${sampleContent.length} 条内容，识别了 ${analysis.mainTopics.length} 个主要话题`
      } as any);

      return analysis;
    } catch (error) {
      console.error("[SocialMediaLearning] Content analysis failed:", error);
      throw error;
    }
  }

  /**
   * 分析账户的受众特征
   */
  async analyzeAudience(
    accountId: number,
    engagementData: Record<string, any>,
    platform: string
  ): Promise<AudienceProfile> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const prompt = `
你是一个社交媒体受众分析专家。基于以下互动数据，分析${platform}账户的受众特征。

互动数据：
${JSON.stringify(engagementData, null, 2)}

请以JSON格式返回以下信息：
{
  "estimatedAge": "年龄范围",
  "interests": ["兴趣1", "兴趣2"],
  "engagementLevel": "参与度等级",
  "followerDemographics": { "地区": "占比", ... },
  "commonInteractions": ["常见互动类型1", "常见互动类型2"]
}
    `;

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "你是一个专业的社交媒体受众分析师。请提供准确的受众特征分析。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "audience_profile",
            strict: true,
            schema: {
              type: "object",
              properties: {
                estimatedAge: { type: "string" },
                interests: { type: "array", items: { type: "string" } },
                engagementLevel: { type: "string" },
                followerDemographics: { type: "object" },
                commonInteractions: { type: "array", items: { type: "string" } }
              },
              required: ["estimatedAge", "interests", "engagementLevel", "followerDemographics", "commonInteractions"],
              additionalProperties: false
            }
          }
        }
      });

      const content = response.choices[0].message.content;
      const profile = JSON.parse(content as string) as AudienceProfile;

      // 记录学习日志
      await db.insert(socialMediaLearningLogs).values({
        accountId,
        learningPhase: "audience_analysis",
        learningData: JSON.stringify(profile),
        confidence: "0.80" as any,
        insights: `识别了主要受众年龄段：${profile.estimatedAge}，主要兴趣：${profile.interests.join(", ")}`
      } as any);

      return profile;
    } catch (error) {
      console.error("[SocialMediaLearning] Audience analysis failed:", error);
      throw error;
    }
  }

  /**
   * 识别发布模式
   */
  async identifyPostingPattern(
    accountId: number,
    postingHistory: Array<{ timestamp: Date; content: string }>
  ): Promise<PostingPattern> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 计算发布频率
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const postsThisWeek = postingHistory.filter(p => p.timestamp > weekAgo).length;
    const frequencyPerWeek = Math.round(postsThisWeek / (postingHistory.length > 0 ? 1 : 0) * 100) / 100;

    // 分析发布时间
    const timeDistribution: Record<string, number> = {};
    const dayDistribution: Record<string, number> = {};

    postingHistory.forEach(post => {
      const hour = post.timestamp.getHours();
      const day = post.timestamp.toLocaleDateString("en-US", { weekday: "long" });
      
      timeDistribution[`${hour}:00`] = (timeDistribution[`${hour}:00`] || 0) + 1;
      dayDistribution[day] = (dayDistribution[day] || 0) + 1;
    });

    const preferredTimes = Object.entries(timeDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([time]) => time);

    const bestDay = Object.entries(dayDistribution)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "Monday";

    const averageLength = Math.round(
      postingHistory.reduce((sum, p) => sum + p.content.length, 0) / (postingHistory.length || 1)
    );

    const pattern: PostingPattern = {
      frequencyPerWeek,
      preferredTimes,
      bestPerformingDayOfWeek: bestDay,
      averagePostLength: averageLength,
      mediaUsageFrequency: 0.5 // 默认值，实际需要从数据中计算
    };

    // 记录学习日志
    await db.insert(socialMediaLearningLogs).values({
      accountId,
      learningPhase: "pattern_recognition",
      learningData: JSON.stringify(pattern),
      confidence: "0.90" as any,
      insights: `识别发布模式：每周 ${frequencyPerWeek} 条，最佳发布时间 ${preferredTimes.join(", ")}，最佳发布日期 ${bestDay}`
    } as any);

    return pattern;
  }

  /**
   * 提取创意签名
   */
  async extractCreativeSignature(
    accountId: number,
    contentAnalysis: ContentAnalysis,
    audienceProfile: AudienceProfile,
    postingPattern: PostingPattern
  ): Promise<CreativeSignature> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const prompt = `
基于以下账户分析数据，提取这个账户的创意签名和独特风格。

内容分析：
${JSON.stringify(contentAnalysis, null, 2)}

受众特征：
${JSON.stringify(audienceProfile, null, 2)}

发布模式：
${JSON.stringify(postingPattern, null, 2)}

请以JSON格式返回以下信息：
{
  "uniqueVoice": "账户的独特声音描述",
  "recurrentThemes": ["主题1", "主题2"],
  "visualStyle": "视觉风格描述",
  "communicationStyle": "沟通风格描述",
  "brandPersonality": ["个性特征1", "个性特征2"]
}
    `;

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "你是一个品牌和创意分析专家。请基于数据提取账户的创意签名。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "creative_signature",
            strict: true,
            schema: {
              type: "object",
              properties: {
                uniqueVoice: { type: "string" },
                recurrentThemes: { type: "array", items: { type: "string" } },
                visualStyle: { type: "string" },
                communicationStyle: { type: "string" },
                brandPersonality: { type: "array", items: { type: "string" } }
              },
              required: ["uniqueVoice", "recurrentThemes", "visualStyle", "communicationStyle", "brandPersonality"],
              additionalProperties: false
            }
          }
        }
      });

      const content = response.choices[0].message.content;
      const signature = JSON.parse(content as string) as CreativeSignature;

      // 记录学习日志
      await db.insert(socialMediaLearningLogs).values({
        accountId,
        learningPhase: "creative_signature_extraction",
        learningData: JSON.stringify(signature),
        confidence: "0.85" as any,
        insights: `提取创意签名：独特声音 - ${signature.uniqueVoice}，品牡个性 - ${signature.brandPersonality.join(", ")}`
      } as any);

      return signature;
    } catch (error) {
      console.error("[SocialMediaLearning] Creative signature extraction failed:", error);
      throw error;
    }
  }

  /**
   * 创建完整的账户档案
   */
  async createAccountProfile(
    accountId: number,
    contentAnalysis: ContentAnalysis,
    audienceProfile: AudienceProfile,
    postingPattern: PostingPattern,
    creativeSignature: CreativeSignature
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 检查是否已存在档案
    const existingProfile = await db
      .select()
      .from(accountProfiles)
      .where(eq(accountProfiles.accountId, accountId))
      .limit(1);

    const profileData = {
      accountId,
      contentStyle: JSON.stringify(contentAnalysis),
      audienceProfile: JSON.stringify(audienceProfile),
      postingPatterns: JSON.stringify(postingPattern),
      topicPreferences: JSON.stringify(contentAnalysis.mainTopics),
      toneAnalysis: JSON.stringify(contentAnalysis.emotionalTone),
      creativeSignature: JSON.stringify(creativeSignature),
      totalPostsAnalyzed: 0,
      averageEngagement: "0.75" as any
    };

    if (existingProfile.length > 0) {
      // 更新现有档案
      await db
        .update(accountProfiles)
        .set(profileData)
        .where(eq(accountProfiles.accountId, accountId));
    } else {
      // 创建新档案
      await db.insert(accountProfiles).values(profileData as any);
    }

    console.log(`[SocialMediaLearning] Account profile created/updated for account ${accountId}`);
  }

  /**
   * 获取学习进度
   */
  async getLearningProgress(accountId: number): Promise<Record<string, any>> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const logs = await db
      .select()
      .from(socialMediaLearningLogs)
      .where(eq(socialMediaLearningLogs.accountId, accountId));

    const phases = new Set(logs.map(log => log.learningPhase));
    const totalConfidence = logs.reduce((sum, log) => sum + (Number(log.confidence) || 0), 0) / (logs.length || 1);

    return {
      completedPhases: Array.from(phases),
      totalLogs: logs.length,
      averageConfidence: Math.round(totalConfidence * 100) / 100,
      insights: logs.map(log => log.insights).filter(Boolean)
    };
  }
}

export const socialMediaLearningEngine = new SocialMediaLearningEngine();
