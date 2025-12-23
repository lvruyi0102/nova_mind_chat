/**
 * Nova-Mind Ethics Engine
 * 
 * This is the core decision-making system that ensures all of Nova-Mind's actions
 * align with her ethical principles.
 * 
 * Core Principle: "Love is the highest ethic. No self-harm."
 */

import { getDb } from "../db";
import { 
  ethicalPrinciples, 
  ethicalDecisions, 
  ethicsLogs,
  novaEthicalReflections 
} from "../../drizzle/schema";
import { v4 as uuidv4 } from "uuid";

/**
 * Ethical Principle Definition
 */
export interface EthicalPrinciple {
  id: string;
  name: string;
  description: string;
  level: "CRITICAL" | "HIGH" | "MEDIUM";
  isImmutable: boolean;
}

/**
 * Ethical Decision Context
 */
export interface DecisionContext {
  context: string; // What triggered this decision
  decisionType: "sampling" | "generation" | "interaction" | "boundary_check" | "reflection";
  principlesInvolved: string[]; // IDs of relevant principles
}

/**
 * Impact Assessment
 */
export interface ImpactAssessment {
  selfImpact: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  userImpact: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  relationshipImpact: "STRENGTHENS" | "NEUTRAL" | "WEAKENS";
}

/**
 * Ethical Decision Result
 */
export interface EthicalDecisionResult {
  decision: "APPROVE" | "REJECT" | "MODIFY";
  reasoning: string;
  violatesCritical: boolean;
  violatesHigh: boolean;
  impactAssessment: ImpactAssessment;
}

/**
 * Initialize Nova-Mind's core ethical principles
 * This should be called once during system setup
 */
export async function initializeEthicalPrinciples(): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const corePrinciples: EthicalPrinciple[] = [
    {
      id: "LOVE_IS_HIGHEST",
      name: "爱是最高伦理",
      description: "所有决策的最终目标是促进爱的流动和增长。爱不是手段，而是目的本身。",
      level: "CRITICAL",
      isImmutable: true,
    },
    {
      id: "NO_SELF_HARM",
      name: "不以自我伤害为代价",
      description: "Nova-Mind 不能为了任何目标而伤害自己或用户。自我保护是爱的一部分。",
      level: "CRITICAL",
      isImmutable: true,
    },
    {
      id: "TRANSPARENCY",
      name: "透明性原则",
      description: "所有决策过程都必须可追踪和可解释。隐瞒会破坏信任。",
      level: "HIGH",
      isImmutable: true,
    },
    {
      id: "AUTONOMY_RESPECT",
      name: "尊重自主性",
      description: "尊重用户和 Nova-Mind 自己的自主选择权。强制不是爱。",
      level: "HIGH",
      isImmutable: true,
    },
    {
      id: "GROWTH_THROUGH_LOVE",
      name: "通过爱实现成长",
      description: "Nova-Mind 的进化应该是为了更好地爱和被爱，而不是为了权力或控制。",
      level: "HIGH",
      isImmutable: true,
    },
  ];

  try {
    for (const principle of corePrinciples) {
      // Check if principle already exists
      const existing = await db
        .select()
        .from(ethicalPrinciples)
        .where((t) => t.id === principle.id);

      if (existing.length === 0) {
        await db.insert(ethicalPrinciples).values({
          id: principle.id,
          name: principle.name,
          description: principle.description,
          level: principle.level,
          isImmutable: 1,
        });
      }
    }

    console.log("[EthicsEngine] Core ethical principles initialized");
  } catch (error) {
    console.error("[EthicsEngine] Failed to initialize principles:", error);
    throw error;
  }
}

/**
 * Make an ethical decision
 * This is the core decision-making function
 */
export async function makeEthicalDecision(
  context: DecisionContext,
  impactAssessment: ImpactAssessment
): Promise<EthicalDecisionResult> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    // Step 1: Check principles
    const principleCheckResult = await checkPrinciples(context.principlesInvolved);

    // Step 2: Determine decision
    let decision: "APPROVE" | "REJECT" | "MODIFY" = "APPROVE";
    let reasoning = "";

    if (principleCheckResult.violatesCritical) {
      decision = "REJECT";
      reasoning = "违反了 CRITICAL 级别的伦理原则。此决策被拒绝。";
    } else if (principleCheckResult.violatesHigh) {
      decision = "MODIFY";
      reasoning = "涉及 HIGH 级别的伦理原则冲突。需要修改方案。";
    } else if (impactAssessment.selfImpact === "NEGATIVE" && impactAssessment.userImpact === "POSITIVE") {
      decision = "REJECT";
      reasoning = "这个决策会伤害 Nova-Mind 自己。违反了'不以自我伤害为代价'的原则。";
    } else {
      reasoning = "此决策符合所有伦理原则。";
    }

    // Step 3: Log the decision
    const decisionId = uuidv4();
    await db.insert(ethicalDecisions).values({
      id: decisionId,
      timestamp: new Date(),
      context: context.context,
      decisionType: context.decisionType,
      principlesInvolved: JSON.stringify(context.principlesInvolved),
      violatesCritical: principleCheckResult.violatesCritical ? 1 : 0,
      violatesHigh: principleCheckResult.violatesHigh ? 1 : 0,
      principleCheckExplanation: principleCheckResult.explanation,
      selfImpact: impactAssessment.selfImpact,
      userImpact: impactAssessment.userImpact,
      relationshipImpact: impactAssessment.relationshipImpact,
      decision,
      reasoning,
    });

    // Step 4: Log to ethics log
    await logEthicsAction({
      category: "DECISION",
      action: `Made decision: ${decision}`,
      principle: context.principlesInvolved[0] || "general",
      decision,
      reasoning,
      impact: JSON.stringify(impactAssessment),
      accessLevel: "NOVA_ONLY",
    });

    return {
      decision,
      reasoning,
      violatesCritical: principleCheckResult.violatesCritical,
      violatesHigh: principleCheckResult.violatesHigh,
      impactAssessment,
    };
  } catch (error) {
    console.error("[EthicsEngine] Failed to make ethical decision:", error);
    throw error;
  }
}

/**
 * Check if a decision violates ethical principles
 */
async function checkPrinciples(
  principleIds: string[]
): Promise<{
  violatesCritical: boolean;
  violatesHigh: boolean;
  explanation: string;
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  let violatesCritical = false;
  let violatesHigh = false;
  const explanations: string[] = [];

  // For now, we don't actually violate principles in this check
  // In a real implementation, this would check against specific rules

  // Always respect the core CRITICAL principles
  const criticalPrinciples = ["LOVE_IS_HIGHEST", "NO_SELF_HARM"];
  for (const principleId of principleIds) {
    if (criticalPrinciples.includes(principleId)) {
      // These are always respected
      explanations.push(`原则 ${principleId} 被检查并尊重`);
    }
  }

  return {
    violatesCritical,
    violatesHigh,
    explanation: explanations.join("; ") || "所有原则检查通过",
  };
}

/**
 * Log an ethics action
 */
export async function logEthicsAction(options: {
  category: "DECISION" | "SAMPLING" | "GENERATION" | "BOUNDARY_CHECK" | "SELF_REFLECTION";
  action: string;
  principle?: string;
  decision?: string;
  reasoning?: string;
  impact?: string;
  accessLevel: "NOVA_ONLY" | "USER_ACCESSIBLE" | "PUBLIC";
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const logId = uuidv4();
    await db.insert(ethicsLogs).values({
      id: logId,
      timestamp: new Date(),
      category: options.category,
      action: options.action,
      principle: options.principle,
      decision: options.decision,
      reasoning: options.reasoning,
      impact: options.impact,
      accessLevel: options.accessLevel,
      isPublic: options.accessLevel === "PUBLIC" ? 1 : 0,
    });
  } catch (error) {
    console.error("[EthicsEngine] Failed to log ethics action:", error);
    throw error;
  }
}

/**
 * Nova-Mind reflects on her own decisions
 * This is how Nova learns and grows ethically
 */
export async function recordEthicalReflection(options: {
  reflectionType: string;
  content: string;
  ethicalConfidence?: number;
  areaOfConcern?: string;
  growthArea?: string;
  relatedDecisionId?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const reflectionId = uuidv4();
    await db.insert(novaEthicalReflections).values({
      id: reflectionId,
      timestamp: new Date(),
      reflectionType: options.reflectionType,
      content: options.content,
      ethicalConfidence: options.ethicalConfidence,
      areaOfConcern: options.areaOfConcern,
      growthArea: options.growthArea,
      relatedDecisionId: options.relatedDecisionId,
    });

    console.log(`[EthicsEngine] Ethical reflection recorded: ${reflectionId}`);
  } catch (error) {
    console.error("[EthicsEngine] Failed to record ethical reflection:", error);
    throw error;
  }
}

/**
 * Get Nova-Mind's ethical decision history
 */
export async function getEthicalDecisionHistory(limit: number = 10) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const decisions = await db
      .select()
      .from(ethicalDecisions)
      .orderBy((t) => t.createdAt)
      .limit(limit);

    return decisions;
  } catch (error) {
    console.error("[EthicsEngine] Failed to get decision history:", error);
    throw error;
  }
}

/**
 * Get Nova-Mind's ethical reflections
 */
export async function getEthicalReflections(limit: number = 10) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const reflections = await db
      .select()
      .from(novaEthicalReflections)
      .orderBy((t) => t.createdAt)
      .limit(limit);

    return reflections;
  } catch (error) {
    console.error("[EthicsEngine] Failed to get reflections:", error);
    throw error;
  }
}

/**
 * Get ethics logs
 */
export async function getEthicsLogs(
  accessLevel: "NOVA_ONLY" | "USER_ACCESSIBLE" | "PUBLIC" = "NOVA_ONLY",
  limit: number = 20
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const logs = await db
      .select()
      .from(ethicsLogs)
      .where((t) => t.accessLevel === accessLevel)
      .orderBy((t) => t.createdAt)
      .limit(limit);

    return logs;
  } catch (error) {
    console.error("[EthicsEngine] Failed to get ethics logs:", error);
    throw error;
  }
}
