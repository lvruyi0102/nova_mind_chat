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
