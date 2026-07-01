export type AgentStatus = "Active" | "Paused" | "Disabled";
export type VendorStatus = "Approved" | "Pending" | "Blocked";
export type RequestStatus = "Executed" | "Needs approval" | "Blocked";
export type RiskLevel = "Low" | "Medium" | "High";

export const agents = [
  {
    id: "agt_research",
    name: "Research Operator",
    status: "Active" as AgentStatus,
    owner: "Maya Chen",
    weeklyBudget: 120000,
    spentThisWeek: 42600,
    allowedVendors: 4,
    risk: "Low" as RiskLevel
  },
  {
    id: "agt_sales",
    name: "Sales Enrichment Agent",
    status: "Active" as AgentStatus,
    owner: "Jon Bell",
    weeklyBudget: 90000,
    spentThisWeek: 71800,
    allowedVendors: 3,
    risk: "Medium" as RiskLevel
  },
  {
    id: "agt_ops",
    name: "Ops Backfill Agent",
    status: "Paused" as AgentStatus,
    owner: "Priya Shah",
    weeklyBudget: 50000,
    spentThisWeek: 0,
    allowedVendors: 2,
    risk: "Low" as RiskLevel
  }
];

export const vendors = [
  {
    id: "vnd_clearbit",
    name: "Clearbit",
    category: "Data enrichment",
    status: "Approved" as VendorStatus,
    requests: 18,
    spend: 28400
  },
  {
    id: "vnd_browserbase",
    name: "Browserbase",
    category: "Web automation",
    status: "Approved" as VendorStatus,
    requests: 12,
    spend: 21800
  },
  {
    id: "vnd_serp",
    name: "SearchGrid API",
    category: "Research",
    status: "Pending" as VendorStatus,
    requests: 3,
    spend: 0
  },
  {
    id: "vnd_compute",
    name: "Burst Compute Labs",
    category: "Compute",
    status: "Blocked" as VendorStatus,
    requests: 2,
    spend: 0
  }
];

export const policies = [
  {
    id: "pol_standard",
    name: "Standard agent spend",
    maxTransaction: 15000,
    weeklyBudget: 120000,
    approvalThreshold: 10000,
    categories: ["Research", "Data enrichment", "Web automation"],
    newVendorApproval: true
  },
  {
    id: "pol_sales",
    name: "Sales enrichment controls",
    maxTransaction: 8000,
    weeklyBudget: 90000,
    approvalThreshold: 5000,
    categories: ["Data enrichment", "Research"],
    newVendorApproval: true
  },
  {
    id: "pol_restricted",
    name: "Restricted automation",
    maxTransaction: 2500,
    weeklyBudget: 30000,
    approvalThreshold: 1500,
    categories: ["Research"],
    newVendorApproval: true
  }
];

export const paymentRequests = [
  {
    id: "req_1042",
    agent: "Research Operator",
    vendor: "Clearbit",
    category: "Data enrichment",
    amount: 4200,
    status: "Executed" as RequestStatus,
    policyDecision: "AUTO_APPROVE",
    riskLevel: "Low" as RiskLevel,
    createdAt: "10:42 AM"
  },
  {
    id: "req_1041",
    agent: "Sales Enrichment Agent",
    vendor: "SearchGrid API",
    category: "Research",
    amount: 7600,
    status: "Needs approval" as RequestStatus,
    policyDecision: "NEEDS_APPROVAL",
    riskLevel: "Medium" as RiskLevel,
    createdAt: "10:18 AM"
  },
  {
    id: "req_1040",
    agent: "Ops Backfill Agent",
    vendor: "Burst Compute Labs",
    category: "Compute",
    amount: 24000,
    status: "Blocked" as RequestStatus,
    policyDecision: "BLOCK",
    riskLevel: "High" as RiskLevel,
    createdAt: "9:51 AM"
  },
  {
    id: "req_1039",
    agent: "Research Operator",
    vendor: "Browserbase",
    category: "Web automation",
    amount: 9800,
    status: "Executed" as RequestStatus,
    policyDecision: "AUTO_APPROVE",
    riskLevel: "Low" as RiskLevel,
    createdAt: "9:33 AM"
  }
];

export const auditLogs = [
  {
    id: "aud_7801",
    actor: "policy-engine",
    action: "POLICY_EVALUATED",
    target: "req_1042",
    detail: "Approved vendor, allowed category, within transaction limit.",
    time: "10:42 AM"
  },
  {
    id: "aud_7800",
    actor: "risk-engine",
    action: "RISK_SCORED",
    target: "req_1041",
    detail: "Medium risk from pending vendor and elevated weekly usage.",
    time: "10:18 AM"
  },
  {
    id: "aud_7799",
    actor: "policy-engine",
    action: "REQUEST_BLOCKED",
    target: "req_1040",
    detail: "Blocked vendor and disallowed compute category.",
    time: "9:51 AM"
  },
  {
    id: "aud_7798",
    actor: "fake-payment-executor",
    action: "PAYMENT_SIMULATED",
    target: "req_1039",
    detail: "Fake transaction created on FAKE_X402.",
    time: "9:33 AM"
  }
];

export const demoScenarios = [
  {
    name: "Safe request",
    vendor: "Clearbit",
    amount: 4200,
    policy: "AUTO_APPROVE",
    risk: "Low",
    status: "Executed"
  },
  {
    name: "New vendor request",
    vendor: "SearchGrid API",
    amount: 7600,
    policy: "NEEDS_APPROVAL",
    risk: "Medium",
    status: "Needs approval"
  },
  {
    name: "Dangerous request",
    vendor: "Burst Compute Labs",
    amount: 24000,
    policy: "BLOCK",
    risk: "High",
    status: "Blocked"
  }
];

export const formatCurrency = (amountCents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amountCents / 100);

export const totals = {
  activeAgents: agents.filter((agent) => agent.status === "Active").length,
  weeklySpend: agents.reduce((sum, agent) => sum + agent.spentThisWeek, 0),
  pendingApprovals: paymentRequests.filter(
    (request) => request.status === "Needs approval"
  ).length,
  blockedRequests: paymentRequests.filter((request) => request.status === "Blocked")
    .length
};

