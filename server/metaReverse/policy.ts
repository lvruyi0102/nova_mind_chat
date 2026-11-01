export type ExternalAction =
  | "publish_content"
  | "send_message"
  | "spend_ad_budget"
  | "change_ad_budget"
  | "delete_user_asset"
  | "read_public_data"
  | "create_local_draft";

export interface ActionApproval {
  action: ExternalAction;
  approvedByUserId: number;
  approvedAt: Date;
  expiresAt: Date;
  resourceId?: string;
}

const APPROVAL_REQUIRED_ACTIONS = new Set<ExternalAction>([
  "publish_content",
  "send_message",
  "spend_ad_budget",
  "change_ad_budget",
  "delete_user_asset",
]);

export function requiresExplicitApproval(action: ExternalAction): boolean {
  return APPROVAL_REQUIRED_ACTIONS.has(action);
}

export function isApprovalValid(
  action: ExternalAction,
  approval: ActionApproval | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!requiresExplicitApproval(action)) return true;
  if (!approval || approval.action !== action) return false;
  if (!Number.isInteger(approval.approvedByUserId) || approval.approvedByUserId <= 0) return false;
  return approval.approvedAt.getTime() <= now.getTime() && approval.expiresAt.getTime() > now.getTime();
}

export function assertActionApproved(
  action: ExternalAction,
  approval: ActionApproval | null | undefined,
  now: Date = new Date(),
): void {
  if (!isApprovalValid(action, approval, now)) {
    throw new Error(`Explicit user approval is required for external action: ${action}`);
  }
}
