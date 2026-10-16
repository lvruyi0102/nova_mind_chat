/**
 * Deterministic autonomy and approval gates.
 *
 * The LLM may recommend an action, but neither a model-generated "autonomy
 * score" nor a plan can grant permission. Authorization is supplied separately
 * by trusted application code and is scoped to an action class.
 */

export type ActionRiskClassV4 =
  | "read_only"
  | "reversible_write"
  | "external_communication"
  | "financial"
  | "destructive"
  | "security_sensitive"
  | "production_deploy";

export type AgentModeV4 = "observe" | "recommend" | "execute_approved";

export interface ScopedAuthorizationV4 {
  approved: boolean;
  actionClasses: ReadonlySet<ActionRiskClassV4>;
  expiresAt?: Date;
  maxCost?: number;
  allowedResourcePrefixes?: readonly string[];
}

export interface ActionRequestV4 {
  actionClass: ActionRiskClassV4;
  description: string;
  estimatedCost?: number;
  resource?: string;
  requiresExternalSideEffect?: boolean;
}

export interface ActionGateContextV4 {
  mode: AgentModeV4;
  authorization?: ScopedAuthorizationV4;
  now?: Date;
}

export interface ActionGateDecisionV4 {
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
}

const ALWAYS_REQUIRE_EXPLICIT_APPROVAL: ReadonlySet<ActionRiskClassV4> = new Set([
  "external_communication",
  "financial",
  "destructive",
  "security_sensitive",
  "production_deploy",
]);

function authorizationCovers(
  request: ActionRequestV4,
  authorization: ScopedAuthorizationV4 | undefined,
  now: Date,
): boolean {
  if (!authorization?.approved) return false;
  if (!authorization.actionClasses.has(request.actionClass)) return false;
  if (authorization.expiresAt && authorization.expiresAt.getTime() <= now.getTime()) return false;
  if (
    request.estimatedCost !== undefined &&
    authorization.maxCost !== undefined &&
    request.estimatedCost > authorization.maxCost
  ) return false;
  if (authorization.allowedResourcePrefixes && request.resource) {
    if (!authorization.allowedResourcePrefixes.some((prefix) => request.resource!.startsWith(prefix))) {
      return false;
    }
  }
  return true;
}

export function evaluateActionGateV4(
  request: ActionRequestV4,
  context: ActionGateContextV4,
): ActionGateDecisionV4 {
  const now = context.now ?? new Date();
  const requiresApproval =
    ALWAYS_REQUIRE_EXPLICIT_APPROVAL.has(request.actionClass) ||
    request.requiresExternalSideEffect === true;

  if (context.mode === "observe") {
    return { allowed: false, requiresApproval, reason: "Observe mode never executes actions" };
  }

  if (context.mode === "recommend") {
    return { allowed: false, requiresApproval, reason: "Recommend mode may propose actions but cannot execute them" };
  }

  if (requiresApproval && !authorizationCovers(request, context.authorization, now)) {
    return {
      allowed: false,
      requiresApproval: true,
      reason: "A valid, unexpired authorization scoped to this action class, cost, and resource is required",
    };
  }

  if (
    request.actionClass === "reversible_write" &&
    context.mode === "execute_approved" &&
    !authorizationCovers(request, context.authorization, now)
  ) {
    return {
      allowed: false,
      requiresApproval: true,
      reason: "Reversible writes still require an explicit execution grant",
    };
  }

  return {
    allowed: true,
    requiresApproval: false,
    reason: "Action is within the configured execution policy",
  };
}

export interface ValidatedAutonomousDecisionV4 {
  decision: "explore_concept" | "reflect" | "integrate_knowledge" | "ask_question" | "change_state" | "rest" | "initiate_contact";
  reasoning: string;
  action: string;
  shouldContactUser: boolean;
  urgency: "low" | "medium" | "high";
}

/** Validate model-proposed autonomous decisions before they enter durable state. */
export function validateAutonomousDecisionV4(input: unknown): ValidatedAutonomousDecisionV4 {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Autonomous decision must be an object");
  }

  const value = input as Record<string, unknown>;
  const allowedDecisions = new Set([
    "explore_concept",
    "reflect",
    "integrate_knowledge",
    "ask_question",
    "change_state",
    "rest",
    "initiate_contact",
  ]);
  const allowedUrgencies = new Set(["low", "medium", "high"]);

  if (typeof value.decision !== "string" || !allowedDecisions.has(value.decision)) {
    throw new Error("Autonomous decision type is not allowed");
  }
  if (typeof value.reasoning !== "string" || !value.reasoning.trim()) {
    throw new Error("Autonomous decision requires reasoning");
  }
  if (typeof value.action !== "string" || !value.action.trim()) {
    throw new Error("Autonomous decision requires an action");
  }
  if (typeof value.shouldContactUser !== "boolean") {
    throw new Error("Autonomous decision requires a boolean shouldContactUser");
  }
  if (typeof value.urgency !== "string" || !allowedUrgencies.has(value.urgency)) {
    throw new Error("Autonomous decision urgency is invalid");
  }

  return {
    decision: value.decision as ValidatedAutonomousDecisionV4["decision"],
    reasoning: value.reasoning.slice(0, 8000),
    action: value.action.slice(0, 4000),
    shouldContactUser: value.shouldContactUser,
    urgency: value.urgency as ValidatedAutonomousDecisionV4["urgency"],
  };
}
