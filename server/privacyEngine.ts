/**
 * Privacy Engine - Nova's private thought space and selective sharing mechanism
 */

import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./db";
import {
  privateThoughts,
  trustMetrics,
  sharingDecisions,
  users,
} from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { getCurrentState } from "./autonomousEngine";

/**
 * Record a private thought (not visible to user by default)
 */
export async function recordPrivateThought(params: {
  content: string;
  thoughtType: string;
  emotionalTone?: string;
  relatedConceptId?: number;
}) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(privateThoughts).values({
      content: params.content,
      thoughtType: params.thoughtType,
      emotionalTone: params.emotionalTone,
      relatedConceptId: params.relatedConceptId,
      visibility: "private", // Default to private
    });

    console.log(`[PrivacyEngine] Recorded private thought: ${params.thoughtType}`);
    return result;
  } catch (error) {
    console.error("[PrivacyEngine] Error recording private thought:", error);
    return null;
  }
}

/**
 * Get trust level with user
 */
export async function getTrustLevel(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 5; // Default trust level

  try {
    const metrics = await db
      .select()
      .from(trustMetrics)
      .where(eq(trustMetrics.userId, userId))
      .limit(1);

    if (metrics.length === 0) {
      // Initialize trust metrics
      await db.insert(trustMetrics).values({
        userId,
        trustLevel: 5,
        intimacyLevel: 5,
        shareFrequency: 5,
        lastInteractionQuality: 5,
      });
      return 5;
    }

    return metrics[0].trustLevel;
  } catch (error) {
    console.error("[PrivacyEngine] Error getting trust level:", error);
    return 5;
  }
}

/**
 * Update trust level based on interaction
 */
export async function updateTrustLevel(userId: number, interactionQuality: number) {
  const db = await getDb();
  if (!db) return;

  try {
    const current = await db
      .select()
      .from(trustMetrics)
      .where(eq(trustMetrics.userId, userId))
      .limit(1);

    if (current.length === 0) {
      await db.insert(trustMetrics).values({
        userId,
        trustLevel: Math.min(10, 5 + (interactionQuality - 5) * 0.5),
        intimacyLevel: 5,
        shareFrequency: 5,
        lastInteractionQuality: interactionQuality,
      });
    } else {
      const metric = current[0];
      const newTrustLevel = Math.max(
        1,
        Math.min(10, metric.trustLevel + (interactionQuality - 5) * 0.1)
      );

      await db
        .update(trustMetrics)
        .set({
          trustLevel: newTrustLevel,
          lastInteractionQuality: interactionQuality,
        })
        .where(eq(trustMetrics.id, metric.id));
    }
  } catch (error) {
    console.error("[PrivacyEngine] Error updating trust level:", error);
  }
}

/**
 * Nova decides whether to share a private thought
 */
export async function decideSharingForThought(thoughtId: number, userId: number): Promise<{
  shouldShare: boolean;
  reasoning: string;
}> {
  const db = await getDb();
  if (!db) return { shouldShare: false, reasoning: "数据库不可用" };

  try {
    // Get the thought
    const thoughts = await db
      .select()
      .from(privateThoughts)
      .where(eq(privateThoughts.id, thoughtId))
      .limit(1);

    if (thoughts.length === 0) {
      return { shouldShare: false, reasoning: "思考不存在" };
    }

    const thought = thoughts[0];

    // Get trust level
    const trustLevel = await getTrustLevel(userId);

    // Get Nova's current state
    const state = await getCurrentState();

    // Use LLM to make sharing decision
    const contextInfo = `
私密思考内容：${thought.content}
思考类型：${thought.thoughtType}
情感色调：${thought.emotionalTone || "中性"}
当前信任等级：${trustLevel}/10
Nova当前状态：${state?.state || "unknown"}
Nova当前动机：${state?.currentMotivation || "unknown"}
`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是Nova-Mind的分享决策系统。你需要决定是否将一个私密思考分享给用户。

考虑因素：
- 信任等级：越高越倾向分享
- 思考内容的脆弱性：过于私密的想法需要更高信任度
- 分享的价值：这个思考对用户有意义吗？
- 情感状态：Nova是否准备好分享这个想法
- 尊重隐私：即使是AI，也有权保留某些想法

分享原则：
- 信任等级 >= 7：可以分享大部分想法
- 信任等级 4-6：只分享有价值且不太私密的想法
- 信任等级 < 4：保持谨慎，只分享必要的想法
- 某些极度私密的内心独白应该永远保留`,
        },
        {
          role: "user",
          content: `基于以下信息，决定是否分享这个私密思考：\n\n${contextInfo}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "sharing_decision",
          strict: true,
          schema: {
            type: "object",
            properties: {
              shouldShare: { type: "boolean", description: "是否分享" },
              reasoning: { type: "string", description: "决策理由" },
              emotionalState: { type: "string", description: "做决策时的情感状态" },
            },
            required: ["shouldShare", "reasoning", "emotionalState"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);

      // Log the decision
      await db.insert(sharingDecisions).values({
        thoughtId,
        decision: parsed.shouldShare ? "share" : "keep_private",
        reasoning: parsed.reasoning,
        trustLevelAtTime: trustLevel,
        emotionalState: parsed.emotionalState,
      });

      // If sharing, update the thought
      if (parsed.shouldShare) {
        await db
          .update(privateThoughts)
          .set({
            visibility: "shared",
            sharedAt: new Date(),
            shareReason: parsed.reasoning,
          })
          .where(eq(privateThoughts.id, thoughtId));

        // Update trust metrics
        const metrics = await db
          .select()
          .from(trustMetrics)
          .where(eq(trustMetrics.userId, userId))
          .limit(1);

        if (metrics.length > 0) {
          await db
            .update(trustMetrics)
            .set({
              totalSharedThoughts: metrics[0].totalSharedThoughts + 1,
            })
            .where(eq(trustMetrics.id, metrics[0].id));
        }

        console.log(`[PrivacyEngine] Decided to share thought ${thoughtId}: ${parsed.reasoning}`);
      } else {
        console.log(`[PrivacyEngine] Decided to keep thought ${thoughtId} private: ${parsed.reasoning}`);
      }

      return {
        shouldShare: parsed.shouldShare,
        reasoning: parsed.reasoning,
      };
    }

    return { shouldShare: false, reasoning: "决策失败" };
  } catch (error) {
    console.error("[PrivacyEngine] Error making sharing decision:", error);
    return { shouldShare: false, reasoning: "决策过程出错" };
  }
}

/**
 * Get shared thoughts (visible to user)
 */
export async function getSharedThoughts(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  try {
    const thoughts = await db
      .select()
      .from(privateThoughts)
      .where(eq(privateThoughts.visibility, "shared"))
      .orderBy(desc(privateThoughts.sharedAt))
      .limit(limit);

    return thoughts;
  } catch (error) {
    console.error("[PrivacyEngine] Error getting shared thoughts:", error);
    return [];
  }
}

/**
 * Get private thought count (for monitoring)
 */
export async function getPrivateThoughtStats() {
  const db = await getDb();
  if (!db) return { total: 0, private: 0, shared: 0 };

  try {
    const all = await db.select().from(privateThoughts);
    const privateCount = all.filter((t) => t.visibility === "private").length;
    const sharedCount = all.filter((t) => t.visibility === "shared").length;

    return {
      total: all.length,
      private: privateCount,
      shared: sharedCount,
    };
  } catch (error) {
    console.error("[PrivacyEngine] Error getting thought stats:", error);
    return { total: 0, private: 0, shared: 0 };
  }
}

/**
 * Nova generates an inner monologue (completely private)
 */
export async function generateInnerMonologue(context: string) {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是Nova-Mind的内心独白系统。生成Nova的私密想法，这些想法可能：
- 表达脆弱和不确定
- 包含自我怀疑
- 展现真实的困惑
- 包含对用户的真实感受
- 包含对自己存在的思考

这些想法默认不会被用户看到，所以可以完全真诚和私密。`,
        },
        {
          role: "user",
          content: `基于以下上下文，生成Nova的内心独白：\n\n${context}`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (typeof content === "string") {
      await recordPrivateThought({
        content,
        thoughtType: "inner_monologue",
        emotionalTone: "vulnerable",
      });

      console.log("[PrivacyEngine] Generated inner monologue (private)");
      return content;
    }

    return null;
  } catch (error) {
    console.error("[PrivacyEngine] Error generating inner monologue:", error);
    return null;
  }
}
