import { describe, expect, it } from "vitest";
import { evaluateActionGateV4, type ScopedAuthorizationV4 } from "./agentGovernanceV4";

const grant: ScopedAuthorizationV4 = {
  approved: true,
  actionClasses: new Set(["external_communication", "reversible_write"]),
  expiresAt: new Date("2030-01-01T00:00:00.000Z"),
  maxCost: 5,
  allowedResourcePrefixes: ["drafts/"],
};

describe("evaluateActionGateV4", () => {
  it("never executes in observe or recommend mode", () => {
    const request = { actionClass: "read_only" as const, description: "Inspect a file" };
    expect(evaluateActionGateV4(request, { mode: "observe" }).allowed).toBe(false);
    expect(evaluateActionGateV4(request, { mode: "recommend" }).allowed).toBe(false);
  });

  it("requires scoped authorization for external communication", () => {
    const request = {
      actionClass: "external_communication" as const,
      description: "Publish a post",
      resource: "drafts/post-1",
    };
    expect(evaluateActionGateV4(request, { mode: "execute_approved" })).toMatchObject({
      allowed: false,
      requiresApproval: true,
    });
    expect(evaluateActionGateV4(request, {
      mode: "execute_approved",
      authorization: grant,
      now: new Date("2029-01-01T00:00:00.000Z"),
    }).allowed).toBe(true);
  });

  it("rejects expired, over-budget, or out-of-scope grants", () => {
    const request = {
      actionClass: "external_communication" as const,
      description: "Publish a post",
      estimatedCost: 6,
      resource: "drafts/post-1",
    };
    expect(evaluateActionGateV4(request, {
      mode: "execute_approved",
      authorization: grant,
      now: new Date("2029-01-01T00:00:00.000Z"),
    }).allowed).toBe(false);

    expect(evaluateActionGateV4({
      ...request,
      estimatedCost: 1,
      resource: "production/delete-all",
    }, {
      mode: "execute_approved",
      authorization: grant,
      now: new Date("2029-01-01T00:00:00.000Z"),
    }).allowed).toBe(false);

    expect(evaluateActionGateV4({
      ...request,
      estimatedCost: 1,
    }, {
      mode: "execute_approved",
      authorization: { ...grant, expiresAt: new Date("2028-01-01T00:00:00.000Z") },
      now: new Date("2029-01-01T00:00:00.000Z"),
    }).allowed).toBe(false);
  });

  it("requires an explicit grant even for reversible writes", () => {
    expect(evaluateActionGateV4({
      actionClass: "reversible_write",
      description: "Save a draft",
      resource: "drafts/post-1",
    }, { mode: "execute_approved" }).allowed).toBe(false);
  });

  it("blocks financial, destructive, security-sensitive and production actions without grant", () => {
    const classes = ["financial", "destructive", "security_sensitive", "production_deploy"] as const;
    for (const actionClass of classes) {
      expect(evaluateActionGateV4({
        actionClass,
        description: "Sensitive operation",
      }, { mode: "execute_approved" }).allowed).toBe(false);
    }
  });
});
