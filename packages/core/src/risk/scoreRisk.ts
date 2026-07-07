export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type VendorRiskStatus = "APPROVED" | "PENDING" | "NEW" | "BLOCKED";

export type PaymentRequestRiskInput = {
  amountCents: number;
  category: string;
  vendorId: string;
  agentId: string;
};

export type VendorRiskInput = {
  id: string;
  status: VendorRiskStatus;
  previousApprovedRequestCount: number;
};

export type RecentRequestRiskInput = {
  vendorId: string;
  agentId: string;
  amountCents: number;
  status: "EXECUTED" | "NEEDS_APPROVAL" | "BLOCKED";
};

export type RiskMetadataInput = {
  agentWeeklyBudgetCents: number;
  spentThisWeekCents: number;
  maxTransactionCents: number;
  sensitiveCategories?: string[];
  hasUnusualMetadata?: boolean;
};

export type RiskSignal =
  | "LOW_AMOUNT"
  | "MEDIUM_AMOUNT"
  | "HIGH_AMOUNT"
  | "APPROVED_VENDOR"
  | "PENDING_VENDOR"
  | "NEW_VENDOR"
  | "BLOCKED_VENDOR"
  | "SENSITIVE_CATEGORY"
  | "NEAR_WEEKLY_BUDGET"
  | "OVER_TRANSACTION_LIMIT"
  | "RECENT_BLOCKED_REQUESTS"
  | "RECENT_APPROVAL_REQUESTS"
  | "NEW_VENDOR_FOR_AGENT"
  | "UNUSUAL_METADATA";

export type ScoreRiskInput = {
  paymentRequest: PaymentRequestRiskInput;
  vendor: VendorRiskInput;
  recentRequestHistory: RecentRequestRiskInput[];
  metadata: RiskMetadataInput;
};

export type ScoreRiskResult = {
  score: number;
  level: RiskLevel;
  signals: RiskSignal[];
};

export function scoreRisk(input: ScoreRiskInput): ScoreRiskResult {
  const signals: RiskSignal[] = [];
  let score = 0;

  const { paymentRequest, vendor, recentRequestHistory, metadata } = input;

  if (paymentRequest.amountCents >= metadata.maxTransactionCents * 2) {
    score += 35;
    signals.push("HIGH_AMOUNT");
  } else if (paymentRequest.amountCents >= metadata.maxTransactionCents * 0.75) {
    score += 15;
    signals.push("MEDIUM_AMOUNT");
  } else {
    signals.push("LOW_AMOUNT");
  }

  if (vendor.status === "APPROVED") {
    signals.push("APPROVED_VENDOR");
  } else if (vendor.status === "PENDING") {
    score += 20;
    signals.push("PENDING_VENDOR");
  } else if (vendor.status === "NEW") {
    score += 30;
    signals.push("NEW_VENDOR");
  } else {
    score += 50;
    signals.push("BLOCKED_VENDOR");
  }

  const sensitiveCategories = metadata.sensitiveCategories ?? [];
  if (sensitiveCategories.includes(paymentRequest.category)) {
    score += 15;
    signals.push("SENSITIVE_CATEGORY");
  }

  const projectedWeeklySpend =
    metadata.spentThisWeekCents + paymentRequest.amountCents;
  if (projectedWeeklySpend >= metadata.agentWeeklyBudgetCents * 0.9) {
    score += 15;
    signals.push("NEAR_WEEKLY_BUDGET");
  }

  if (paymentRequest.amountCents > metadata.maxTransactionCents) {
    score += 20;
    signals.push("OVER_TRANSACTION_LIMIT");
  }

  const recentBlockedCount = recentRequestHistory.filter(
    (request) => request.status === "BLOCKED"
  ).length;
  if (recentBlockedCount > 0) {
    score += Math.min(20, recentBlockedCount * 10);
    signals.push("RECENT_BLOCKED_REQUESTS");
  }

  const recentApprovalCount = recentRequestHistory.filter(
    (request) => request.status === "NEEDS_APPROVAL"
  ).length;
  if (recentApprovalCount >= 2) {
    score += 10;
    signals.push("RECENT_APPROVAL_REQUESTS");
  }

  const hasAgentUsedVendor = recentRequestHistory.some(
    (request) =>
      request.agentId === paymentRequest.agentId &&
      request.vendorId === paymentRequest.vendorId &&
      request.status === "EXECUTED"
  );
  if (!hasAgentUsedVendor && vendor.previousApprovedRequestCount === 0) {
    score += 10;
    signals.push("NEW_VENDOR_FOR_AGENT");
  }

  if (metadata.hasUnusualMetadata) {
    score += 10;
    signals.push("UNUSUAL_METADATA");
  }

  const boundedScore = Math.min(100, Math.max(0, score));

  return {
    score: boundedScore,
    level: getRiskLevel(boundedScore),
    signals
  };
}

function getRiskLevel(score: number): RiskLevel {
  if (score <= 29) {
    return "LOW";
  }

  if (score <= 69) {
    return "MEDIUM";
  }

  return "HIGH";
}

