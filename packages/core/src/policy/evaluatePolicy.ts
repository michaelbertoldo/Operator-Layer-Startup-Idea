export type AgentStatus = "ACTIVE" | "PAUSED" | "DISABLED";
export type VendorStatus = "APPROVED" | "PENDING" | "NEW" | "BLOCKED";
export type PolicyDecision = "AUTO_APPROVE" | "NEEDS_APPROVAL" | "BLOCK";

export type PolicyReason =
  | "AGENT_NOT_ACTIVE"
  | "VENDOR_BLOCKED"
  | "WEEKLY_BUDGET_EXCEEDED"
  | "CATEGORY_NOT_ALLOWED"
  | "VENDOR_REQUIRES_APPROVAL"
  | "TRANSACTION_LIMIT_EXCEEDED"
  | "POLICY_PASSED";

export type EvaluatePolicyInput = {
  agentStatus: AgentStatus;
  amountCents: number;
  maxTransactionCents: number;
  weeklyBudgetCents: number;
  spentThisWeekCents: number;
  vendorStatus: VendorStatus;
  category: string;
  allowedCategories: string[];
  requireApprovalForNewVendor: boolean;
};

export type EvaluatePolicyResult = {
  decision: PolicyDecision;
  reasons: PolicyReason[];
};

export function evaluatePolicy(input: EvaluatePolicyInput): EvaluatePolicyResult {
  const blockReasons: PolicyReason[] = [];

  if (input.agentStatus === "PAUSED" || input.agentStatus === "DISABLED") {
    blockReasons.push("AGENT_NOT_ACTIVE");
  }

  if (input.vendorStatus === "BLOCKED") {
    blockReasons.push("VENDOR_BLOCKED");
  }

  if (input.spentThisWeekCents + input.amountCents > input.weeklyBudgetCents) {
    blockReasons.push("WEEKLY_BUDGET_EXCEEDED");
  }

  if (!input.allowedCategories.includes(input.category)) {
    blockReasons.push("CATEGORY_NOT_ALLOWED");
  }

  if (blockReasons.length > 0) {
    return {
      decision: "BLOCK",
      reasons: blockReasons
    };
  }

  const approvalReasons: PolicyReason[] = [];

  if (
    input.requireApprovalForNewVendor &&
    (input.vendorStatus === "PENDING" || input.vendorStatus === "NEW")
  ) {
    approvalReasons.push("VENDOR_REQUIRES_APPROVAL");
  }

  if (input.amountCents > input.maxTransactionCents) {
    approvalReasons.push("TRANSACTION_LIMIT_EXCEEDED");
  }

  if (approvalReasons.length > 0) {
    return {
      decision: "NEEDS_APPROVAL",
      reasons: approvalReasons
    };
  }

  return {
    decision: "AUTO_APPROVE",
    reasons: ["POLICY_PASSED"]
  };
}

