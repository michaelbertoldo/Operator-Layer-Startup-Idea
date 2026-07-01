import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const companyId = "cmp_acme";

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.paymentRequest.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  await prisma.company.create({
    data: {
      id: companyId,
      name: "Acme AI Operations",
      environment: "Fake-money MVP",
      paymentExecutor: "FAKE_X402"
    }
  });

  await prisma.user.createMany({
    data: [
      {
        id: "usr_maya",
        companyId,
        name: "Maya Chen",
        email: "maya@acme.example",
        role: "Admin"
      },
      {
        id: "usr_jon",
        companyId,
        name: "Jon Bell",
        email: "jon@acme.example",
        role: "Member"
      },
      {
        id: "usr_priya",
        companyId,
        name: "Priya Shah",
        email: "priya@acme.example",
        role: "Member"
      }
    ]
  });

  await prisma.policy.createMany({
    data: [
      {
        id: "pol_standard",
        companyId,
        name: "Standard agent spend",
        maxTransactionCents: 15000,
        weeklyBudgetCents: 120000,
        approvalThresholdCents: 10000,
        allowedCategories: "Research|Data enrichment|Web automation",
        requireApprovalForNewVendor: true
      },
      {
        id: "pol_sales",
        companyId,
        name: "Sales enrichment controls",
        maxTransactionCents: 8000,
        weeklyBudgetCents: 90000,
        approvalThresholdCents: 5000,
        allowedCategories: "Data enrichment|Research",
        requireApprovalForNewVendor: true
      },
      {
        id: "pol_restricted",
        companyId,
        name: "Restricted automation",
        maxTransactionCents: 2500,
        weeklyBudgetCents: 30000,
        approvalThresholdCents: 1500,
        allowedCategories: "Research",
        requireApprovalForNewVendor: true
      }
    ]
  });

  await prisma.agent.createMany({
    data: [
      {
        id: "agt_research",
        companyId,
        policyId: "pol_standard",
        name: "Research Operator",
        status: "Active",
        ownerName: "Maya Chen",
        weeklyBudgetCents: 120000,
        spentThisWeekCents: 42600,
        approvedVendorCount: 4,
        riskLevel: "Low"
      },
      {
        id: "agt_sales",
        companyId,
        policyId: "pol_sales",
        name: "Sales Enrichment Agent",
        status: "Active",
        ownerName: "Jon Bell",
        weeklyBudgetCents: 90000,
        spentThisWeekCents: 71800,
        approvedVendorCount: 3,
        riskLevel: "Medium"
      },
      {
        id: "agt_ops",
        companyId,
        policyId: "pol_restricted",
        name: "Ops Backfill Agent",
        status: "Paused",
        ownerName: "Priya Shah",
        weeklyBudgetCents: 50000,
        spentThisWeekCents: 0,
        approvedVendorCount: 2,
        riskLevel: "Low"
      }
    ]
  });

  await prisma.vendor.createMany({
    data: [
      {
        id: "vnd_clearbit",
        companyId,
        name: "Clearbit",
        category: "Data enrichment",
        status: "Approved",
        requestCount: 18,
        simulatedSpendCents: 28400
      },
      {
        id: "vnd_browserbase",
        companyId,
        name: "Browserbase",
        category: "Web automation",
        status: "Approved",
        requestCount: 12,
        simulatedSpendCents: 21800
      },
      {
        id: "vnd_serp",
        companyId,
        name: "SearchGrid API",
        category: "Research",
        status: "Pending",
        requestCount: 3,
        simulatedSpendCents: 0
      },
      {
        id: "vnd_compute",
        companyId,
        name: "Burst Compute Labs",
        category: "Compute",
        status: "Blocked",
        requestCount: 2,
        simulatedSpendCents: 0
      },
      {
        id: "vnd_vectorhub",
        companyId,
        name: "VectorHub",
        category: "Data enrichment",
        status: "Approved",
        requestCount: 7,
        simulatedSpendCents: 9200
      }
    ]
  });

  await prisma.paymentRequest.createMany({
    data: [
      {
        id: "req_1042",
        companyId,
        agentId: "agt_research",
        vendorId: "vnd_clearbit",
        category: "Data enrichment",
        amountCents: 4200,
        status: "Executed",
        policyDecision: "AUTO_APPROVE",
        riskLevel: "Low",
        createdAt: new Date("2026-07-01T10:42:00.000Z")
      },
      {
        id: "req_1041",
        companyId,
        agentId: "agt_sales",
        vendorId: "vnd_serp",
        category: "Research",
        amountCents: 7600,
        status: "Needs approval",
        policyDecision: "NEEDS_APPROVAL",
        riskLevel: "Medium",
        createdAt: new Date("2026-07-01T10:18:00.000Z")
      },
      {
        id: "req_1040",
        companyId,
        agentId: "agt_ops",
        vendorId: "vnd_compute",
        category: "Compute",
        amountCents: 24000,
        status: "Blocked",
        policyDecision: "BLOCK",
        riskLevel: "High",
        createdAt: new Date("2026-07-01T09:51:00.000Z")
      },
      {
        id: "req_1039",
        companyId,
        agentId: "agt_research",
        vendorId: "vnd_browserbase",
        category: "Web automation",
        amountCents: 9800,
        status: "Executed",
        policyDecision: "AUTO_APPROVE",
        riskLevel: "Low",
        createdAt: new Date("2026-07-01T09:33:00.000Z")
      }
    ]
  });

  await prisma.auditLog.createMany({
    data: [
      {
        id: "aud_7801",
        companyId,
        paymentRequestId: "req_1042",
        actor: "policy-engine",
        action: "POLICY_EVALUATED",
        target: "req_1042",
        detail: "Approved vendor, allowed category, within transaction limit.",
        createdAt: new Date("2026-07-01T10:42:10.000Z")
      },
      {
        id: "aud_7800",
        companyId,
        paymentRequestId: "req_1041",
        actor: "risk-engine",
        action: "RISK_SCORED",
        target: "req_1041",
        detail: "Medium risk from pending vendor and elevated weekly usage.",
        createdAt: new Date("2026-07-01T10:18:10.000Z")
      },
      {
        id: "aud_7799",
        companyId,
        paymentRequestId: "req_1040",
        actor: "policy-engine",
        action: "REQUEST_BLOCKED",
        target: "req_1040",
        detail: "Blocked vendor and disallowed compute category.",
        createdAt: new Date("2026-07-01T09:51:10.000Z")
      },
      {
        id: "aud_7798",
        companyId,
        paymentRequestId: "req_1039",
        actor: "fake-payment-executor",
        action: "PAYMENT_SIMULATED",
        target: "req_1039",
        detail: "Fake transaction created on FAKE_X402.",
        createdAt: new Date("2026-07-01T09:33:10.000Z")
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

