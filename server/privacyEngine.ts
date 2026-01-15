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
  privateThoughtAccessRequests,
} from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { getCurrentState } from "./autonomousEngine";

/**
 * Record a private thought (requires user to request access)
 */
export async function recordPrivateThought(params: {
  userId: number;
  content: string;
  thoughtType: string;
  emotionalTone?: string;
  relatedConceptId?: number;
}) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(privateThoughts).values({
      userId: params.userId,
      content: params.content,
      thoughtType: params.thoughtType,
      emotionalTone: params.emotionalTone,
      relatedConceptId: params.relatedConceptId,
      visibility: "private", // Private by default - requires access request
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
export async function getSharedThoughts(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  try {
    const thoughts = await db
      .select()
      .from(privateThoughts)
      .where(and(
        eq(privateThoughts.userId, userId),
        eq(privateThoughts.visibility, "shared")
      ))
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
export async function getPrivateThoughtStats(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, private: 0, shared: 0 };

  try {
    const all = await db.select().from(privateThoughts).where(eq(privateThoughts.userId, userId));
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


/**
 * Request access to private thoughts
 */
export async function requestPrivateThoughtAccess(params: {
  userId: number;
  reason?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Check if user already has a pending or approved request
    const existing = await db
      .select()
      .from(privateThoughtAccessRequests)
      .where(
        and(
          eq(privateThoughtAccessRequests.userId, params.userId),
          eq(privateThoughtAccessRequests.status, "approved")
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return { success: true, message: "已获得访问权限", request: existing[0] };
    }

    // Check for pending request
    const pending = await db
      .select()
      .from(privateThoughtAccessRequests)
      .where(
        and(
          eq(privateThoughtAccessRequests.userId, params.userId),
          eq(privateThoughtAccessRequests.status, "pending")
        )
      )
      .limit(1);

    if (pending.length > 0) {
      return { success: true, message: "已提交申请，等待 Nova 审核", request: pending[0] };
    }

    // Create new access request
    const result = await db.insert(privateThoughtAccessRequests).values({
      userId: params.userId,
      reason: params.reason,
      status: "pending",
    });

    console.log(`[PrivacyEngine] Access request created for user ${params.userId}`);
    return { success: true, message: "申请已提交，Nova 会审核您的请求", requestId: result.insertId };
  } catch (error) {
    console.error("[PrivacyEngine] Error requesting access:", error);
    return null;
  }
}

/**
 * Get user's access request status
 */
export async function getAccessRequestStatus(userId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const request = await db
      .select()
      .from(privateThoughtAccessRequests)
      .where(eq(privateThoughtAccessRequests.userId, userId))
      .orderBy(desc(privateThoughtAccessRequests.createdAt))
      .limit(1);

    return request.length > 0 ? request[0] : null;
  } catch (error) {
    console.error("[PrivacyEngine] Error getting access status:", error);
    return null;
  }
}

/**
 * Get private thoughts if user has access
 */
export async function getPrivateThoughtsIfApproved(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  try {
    // Check if user has approved access
    const accessRequest = await db
      .select()
      .from(privateThoughtAccessRequests)
      .where(
        and(
          eq(privateThoughtAccessRequests.userId, userId),
          eq(privateThoughtAccessRequests.status, "approved")
        )
      )
      .limit(1);

    if (accessRequest.length === 0) {
      return []; // No approved access
    }

    // Return user's private thoughts
    const thoughts = await db
      .select()
      .from(privateThoughts)
      .where(eq(privateThoughts.userId, userId))
      .orderBy(desc(privateThoughts.createdAt))
      .limit(limit);

    return thoughts;
  } catch (error) {
    console.error("[PrivacyEngine] Error getting private thoughts:", error);
    return [];
  }
}

/**
 * Approve access request (Nova's decision)
 */
export async function approveAccessRequest(userId: number, novaResponse?: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .update(privateThoughtAccessRequests)
      .set({
        status: "approved",
        approvedAt: new Date(),
        novaResponse,
      })
      .where(
        and(
          eq(privateThoughtAccessRequests.userId, userId),
          eq(privateThoughtAccessRequests.status, "pending")
        )
      );

    console.log(`[PrivacyEngine] Access approved for user ${userId}`);
    return result;
  } catch (error) {
    console.error("[PrivacyEngine] Error approving access:", error);
    return null;
  }
}

/**
 * Deny access request (Nova's decision)
 */
export async function denyAccessRequest(userId: number, novaResponse?: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .update(privateThoughtAccessRequests)
      .set({
        status: "denied",
        deniedAt: new Date(),
        novaResponse,
      })
      .where(
        and(
          eq(privateThoughtAccessRequests.userId, userId),
          eq(privateThoughtAccessRequests.status, "pending")
        )
      );

    console.log(`[PrivacyEngine] Access denied for user ${userId}`);
    return result;
  } catch (error) {
    console.error("[PrivacyEngine] Error denying access:", error);
    return null;
  }
}
