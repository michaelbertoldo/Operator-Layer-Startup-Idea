import { describe, expect, it } from "vitest";
import {
  type EvaluatePolicyInput,
  evaluatePolicy
} from "./evaluatePolicy";

const cleanRequest: EvaluatePolicyInput = {
  agentStatus: "ACTIVE",
  amountCents: 2_500,
  maxTransactionCents: 10_000,
  weeklyBudgetCents: 50_000,
  spentThisWeekCents: 12_000,
  vendorStatus: "APPROVED",
  category: "Research",
  allowedCategories: ["Research", "Data enrichment"],
  requireApprovalForNewVendor: true
};

describe("evaluatePolicy", () => {
  it("auto-approves a clean request", () => {
    expect(evaluatePolicy(cleanRequest)).toEqual({
      decision: "AUTO_APPROVE",
      reasons: ["POLICY_PASSED"]
    });
  });

  it("blocks paused agents", () => {
    expect(
      evaluatePolicy({
        ...cleanRequest,
        agentStatus: "PAUSED"
      })
    ).toEqual({
      decision: "BLOCK",
      reasons: ["AGENT_NOT_ACTIVE"]
    });
  });

  it("blocks disabled agents", () => {
    expect(
      evaluatePolicy({
        ...cleanRequest,
        agentStatus: "DISABLED"
      })
    ).toEqual({
      decision: "BLOCK",
      reasons: ["AGENT_NOT_ACTIVE"]
    });
  });

  it("blocks blocked vendors", () => {
    expect(
      evaluatePolicy({
        ...cleanRequest,
        vendorStatus: "BLOCKED"
      })
    ).toEqual({
      decision: "BLOCK",
      reasons: ["VENDOR_BLOCKED"]
    });
  });

  it("blocks weekly budget overflow", () => {
    expect(
      evaluatePolicy({
        ...cleanRequest,
        amountCents: 40_001,
        spentThisWeekCents: 10_000,
        weeklyBudgetCents: 50_000
      })
    ).toEqual({
      decision: "BLOCK",
      reasons: ["WEEKLY_BUDGET_EXCEEDED"]
    });
  });

  it("allows a request that exactly reaches the weekly budget", () => {
    expect(
      evaluatePolicy({
        ...cleanRequest,
        amountCents: 8_000,
        spentThisWeekCents: 42_000,
        weeklyBudgetCents: 50_000
      }).decision
    ).toBe("AUTO_APPROVE");
  });

  it("blocks disallowed categories", () => {
    expect(
      evaluatePolicy({
        ...cleanRequest,
        category: "Compute"
      })
    ).toEqual({
      decision: "BLOCK",
      reasons: ["CATEGORY_NOT_ALLOWED"]
    });
  });

  it("requires approval for a pending vendor when policy requires it", () => {
    expect(
      evaluatePolicy({
        ...cleanRequest,
        vendorStatus: "PENDING"
      })
    ).toEqual({
      decision: "NEEDS_APPROVAL",
      reasons: ["VENDOR_REQUIRES_APPROVAL"]
    });
  });

  it("requires approval for a new vendor when policy requires it", () => {
    expect(
      evaluatePolicy({
        ...cleanRequest,
        vendorStatus: "NEW"
      })
    ).toEqual({
      decision: "NEEDS_APPROVAL",
      reasons: ["VENDOR_REQUIRES_APPROVAL"]
    });
  });

  it("auto-approves a new vendor when new vendor approval is not required", () => {
    expect(
      evaluatePolicy({
        ...cleanRequest,
        vendorStatus: "NEW",
        requireApprovalForNewVendor: false
      }).decision
    ).toBe("AUTO_APPROVE");
  });

  it("requires approval for requests over the transaction limit", () => {
    expect(
      evaluatePolicy({
        ...cleanRequest,
        amountCents: 10_001,
        maxTransactionCents: 10_000
      })
    ).toEqual({
      decision: "NEEDS_APPROVAL",
      reasons: ["TRANSACTION_LIMIT_EXCEEDED"]
    });
  });

  it("returns all hard block reasons before approval reasons", () => {
    expect(
      evaluatePolicy({
        ...cleanRequest,
        agentStatus: "PAUSED",
        vendorStatus: "BLOCKED",
        category: "Compute",
        amountCents: 60_000,
        spentThisWeekCents: 1_000,
        weeklyBudgetCents: 50_000,
        maxTransactionCents: 10_000
      })
    ).toEqual({
      decision: "BLOCK",
      reasons: [
        "AGENT_NOT_ACTIVE",
        "VENDOR_BLOCKED",
        "WEEKLY_BUDGET_EXCEEDED",
        "CATEGORY_NOT_ALLOWED"
      ]
    });
  });

  it("returns multiple approval reasons when both review rules apply", () => {
    expect(
      evaluatePolicy({
        ...cleanRequest,
        vendorStatus: "PENDING",
        amountCents: 10_001,
        maxTransactionCents: 10_000
      })
    ).toEqual({
      decision: "NEEDS_APPROVAL",
      reasons: ["VENDOR_REQUIRES_APPROVAL", "TRANSACTION_LIMIT_EXCEEDED"]
    });
  });
});

