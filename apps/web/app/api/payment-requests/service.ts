import {
  evaluatePolicy,
  fakePaymentExecutor,
  scoreRisk,
  type AgentStatus,
  type PolicyDecision,
  type RiskLevel,
  type VendorStatus
} from "@operatorlayer/core";
import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";

export const createPaymentRequestSchema = z.object({
  agentId: z.string().min(1),
  vendorId: z.string().min(1),
  amountCents: z.number().int().nonnegative(),
  category: z.string().min(1),
  metadata: z
    .object({
      hasUnusualMetadata: z.boolean().optional(),
      sensitiveCategories: z.array(z.string()).optional()
    })
    .optional()
});

type CreatePaymentRequestInput = z.infer<typeof createPaymentRequestSchema>;

type PaymentRequestStatus = "Executed" | "Needs approval" | "Blocked";

export async function createPaymentRequest(
  prisma: PrismaClient,
  input: CreatePaymentRequestInput
) {
  const agent = await prisma.agent.findUnique({
    where: { id: input.agentId },
    include: { policy: true }
  });

  if (!agent) {
    return {
      ok: false as const,
      status: 404,
      error: "Agent not found."
    };
  }

  if (!agent.policy) {
    return {
      ok: false as const,
      status: 422,
      error: "Agent has no policy."
    };
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: input.vendorId }
  });

  if (!vendor) {
    return {
      ok: false as const,
      status: 404,
      error: "Vendor not found."
    };
  }

  if (vendor.companyId !== agent.companyId || agent.policy.companyId !== agent.companyId) {
    return {
      ok: false as const,
      status: 422,
      error: "Agent, vendor, and policy must belong to the same company."
    };
  }

  const recentRequests = await prisma.paymentRequest.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  const policyResult = evaluatePolicy({
    agentStatus: mapAgentStatus(agent.status),
    amountCents: input.amountCents,
    maxTransactionCents: agent.policy.maxTransactionCents,
    weeklyBudgetCents: agent.policy.weeklyBudgetCents,
    spentThisWeekCents: agent.spentThisWeekCents,
    vendorStatus: mapVendorStatus(vendor.status),
    category: input.category,
    allowedCategories: agent.policy.allowedCategories.split("|"),
    requireApprovalForNewVendor: agent.policy.requireApprovalForNewVendor
  });

  const riskResult = scoreRisk({
    paymentRequest: {
      amountCents: input.amountCents,
      category: input.category,
      vendorId: vendor.id,
      agentId: agent.id
    },
    vendor: {
      id: vendor.id,
      status: mapVendorStatus(vendor.status),
      previousApprovedRequestCount: vendor.requestCount
    },
    recentRequestHistory: recentRequests.map((request) => ({
      vendorId: request.vendorId,
      agentId: request.agentId,
      amountCents: request.amountCents,
      status: mapStoredStatusToCore(request.status)
    })),
    metadata: {
      agentWeeklyBudgetCents: agent.weeklyBudgetCents,
      spentThisWeekCents: agent.spentThisWeekCents,
      maxTransactionCents: agent.policy.maxTransactionCents,
      sensitiveCategories: input.metadata?.sensitiveCategories ?? ["Compute"],
      hasUnusualMetadata: input.metadata?.hasUnusualMetadata
    }
  });

  const finalStatus = getFinalStatus(policyResult.decision, riskResult.level);
  const paymentRequestId = `req_${crypto.randomUUID()}`;

  const result = await prisma.$transaction(async (tx) => {
    const createdRequest = await tx.paymentRequest.create({
      data: {
        id: paymentRequestId,
        companyId: agent.companyId,
        agentId: agent.id,
        vendorId: vendor.id,
        category: input.category,
        amountCents: input.amountCents,
        status: finalStatus,
        policyDecision: policyResult.decision,
        riskLevel: toDisplayRiskLevel(riskResult.level),
        riskScore: riskResult.score
      },
      include: {
        agent: true,
        vendor: true
      }
    });

    await createAuditLog(tx, {
      companyId: agent.companyId,
      paymentRequestId,
      actor: "payment-request-api",
      action: "REQUEST_CREATED",
      detail: `Payment request created for ${vendor.name}.`
    });

    await createAuditLog(tx, {
      companyId: agent.companyId,
      paymentRequestId,
      actor: "policy-engine",
      action: "POLICY_EVALUATED",
      detail: `${policyResult.decision}: ${policyResult.reasons.join(", ")}`
    });

    await createAuditLog(tx, {
      companyId: agent.companyId,
      paymentRequestId,
      actor: "risk-engine",
      action: "RISK_SCORED",
      detail: `${riskResult.level} risk (${riskResult.score}): ${riskResult.signals.join(", ")}`
    });

    await createAuditLog(tx, {
      companyId: agent.companyId,
      paymentRequestId,
      actor: "payment-request-api",
      action: "FINAL_DECISION",
      detail: `Final status: ${finalStatus}.`
    });

    if (finalStatus !== "Executed") {
      return {
        paymentRequest: createdRequest,
        policyResult,
        riskResult,
        fakePayment: null
      };
    }

    const fakePayment = fakePaymentExecutor({
      paymentRequestId,
      amountCents: input.amountCents
    });

    const executedRequest = await tx.paymentRequest.update({
      where: { id: paymentRequestId },
      data: {
        fakeTransactionId: fakePayment.fakeTransactionId,
        fakeRail: fakePayment.rail,
        fakeAsset: fakePayment.asset,
        executedAt: fakePayment.executedAt
      },
      include: {
        agent: true,
        vendor: true
      }
    });

    await tx.agent.update({
      where: { id: agent.id },
      data: {
        spentThisWeekCents: {
          increment: input.amountCents
        }
      }
    });

    await tx.vendor.update({
      where: { id: vendor.id },
      data: {
        requestCount: {
          increment: 1
        },
        simulatedSpendCents: {
          increment: input.amountCents
        }
      }
    });

    await createAuditLog(tx, {
      companyId: agent.companyId,
      paymentRequestId,
      actor: "fake-payment-executor",
      action: "PAYMENT_SIMULATED",
      detail: `${fakePayment.fakeTransactionId} executed on ${fakePayment.rail} for ${fakePayment.asset}.`
    });

    return {
      paymentRequest: executedRequest,
      policyResult,
      riskResult,
      fakePayment
    };
  });

  const auditLogs = await prisma.auditLog.findMany({
    where: { paymentRequestId },
    orderBy: { createdAt: "asc" }
  });

  return {
    ok: true as const,
    status: 201,
    data: {
      ...result,
      auditLogs
    }
  };
}

export function getFinalStatus(
  policyDecision: PolicyDecision,
  riskLevel: RiskLevel
): PaymentRequestStatus {
  if (policyDecision === "BLOCK" || riskLevel === "HIGH") {
    return "Blocked";
  }

  if (policyDecision === "NEEDS_APPROVAL" || riskLevel === "MEDIUM") {
    return "Needs approval";
  }

  return "Executed";
}

function mapAgentStatus(status: string): AgentStatus {
  if (status === "Active") {
    return "ACTIVE";
  }

  if (status === "Paused") {
    return "PAUSED";
  }

  return "DISABLED";
}

function mapVendorStatus(status: string): VendorStatus {
  if (status === "Approved") {
    return "APPROVED";
  }

  if (status === "Pending") {
    return "PENDING";
  }

  if (status === "Blocked") {
    return "BLOCKED";
  }

  return "NEW";
}

function mapStoredStatusToCore(
  status: string
): "EXECUTED" | "NEEDS_APPROVAL" | "BLOCKED" {
  if (status === "Executed") {
    return "EXECUTED";
  }

  if (status === "Needs approval") {
    return "NEEDS_APPROVAL";
  }

  return "BLOCKED";
}

function toDisplayRiskLevel(level: RiskLevel) {
  if (level === "LOW") {
    return "Low";
  }

  if (level === "MEDIUM") {
    return "Medium";
  }

  return "High";
}

async function createAuditLog(
  tx: Prisma.TransactionClient,
  input: {
    companyId: string;
    paymentRequestId: string;
    actor: string;
    action: string;
    detail: string;
  }
) {
  await tx.auditLog.create({
    data: {
      id: `aud_${crypto.randomUUID()}`,
      companyId: input.companyId,
      paymentRequestId: input.paymentRequestId,
      actor: input.actor,
      action: input.action,
      target: input.paymentRequestId,
      detail: input.detail
    }
  });
}
