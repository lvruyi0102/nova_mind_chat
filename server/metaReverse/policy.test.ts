import { describe, expect, it } from "vitest";
import {
  assertActionApproved,
  isApprovalValid,
  requiresExplicitApproval,
} from "./policy";

describe("Meta reverse external action policy", () => {
  const now = new Date("2026-11-01T00:00:00.000Z");
  const validApproval = {
    action: "publish_content" as const,
    approvedByUserId: 7,
    approvedAt: new Date("2026-10-31T23:00:00.000Z"),
    expiresAt: new Date("2026-11-01T01:00:00.000Z"),
  };

  it("requires explicit approval for external side effects", () => {
    expect(requiresExplicitApproval("publish_content")).toBe(true);
    expect(requiresExplicitApproval("spend_ad_budget")).toBe(true);
    expect(requiresExplicitApproval("read_public_data")).toBe(false);
    expect(requiresExplicitApproval("create_local_draft")).toBe(false);
  });

  it("accepts a matching, unexpired approval", () => {
    expect(isApprovalValid("publish_content", validApproval, now)).toBe(true);
  });

  it("rejects missing, mismatched, or expired approval", () => {
    expect(isApprovalValid("publish_content", null, now)).toBe(false);
    expect(isApprovalValid("send_message", validApproval, now)).toBe(false);
    expect(
      isApprovalValid("publish_content", {
        ...validApproval,
        expiresAt: new Date("2026-10-31T23:59:59.000Z"),
      }, now),
    ).toBe(false);
  });

  it("throws rather than allowing an unapproved external action", () => {
    expect(() => assertActionApproved("spend_ad_budget", null, now)).toThrow(
      "Explicit user approval is required",
    );
  });
});
