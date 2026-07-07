import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma, ReservationState } from "@prisma/client";
import {
  evaluatePolicy,
  fakePaymentExecutor,
  scoreRisk,
  type AgentStatus,
  type PolicyDecision,
  type RiskLevel,
  type VendorStatus
} from "@operatorlayer/core";
import { z } from "zod";
import { appendAuditLog } from "@/lib/appendAuditLog";
import { authenticateAgent } from "@/lib/authenticateAgent";
import { breakerConfig, evaluateBreaker } from "@/lib/circuitBreaker";
import { prisma } from "@/lib/prisma";
import { reserveBudget } from "@/lib/reserveBudget";

const createPaymentRequestSchema = z.object({
  agentId: z.string().min(1).optional(),
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const agentId = url.searchParams.get("agentId");

  if (!agentId) {
    return NextResponse.json({ error: "agentId is required." }, { status: 400 });
  }

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { policy: true }
  });

  if (!agent || !agent.policy) {
    return NextResponse.json({ error: "Agent not found." }, { status: 404 });
  }

  return NextResponse.json({
    agentId: agent.id,
    weeklyBudgetCents: agent.policy.weeklyBudgetCents,
    spentThisWeekCents: agent.spentThisWeekCents,
    remainingBudgetCents: Math.max(
      0,
      agent.policy.weeklyBudgetCents - agent.spentThisWeekCents
    )
  });
}

export async function POST(request: Request) {
  const authenticatedAgent = await authenticateAgent(
    prisma,
    request.headers.get("authorization")
  );

  if (!authenticatedAgent) {
    return NextResponse.json(
      { error: "A valid agent bearer token is required." },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createPaymentRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payment request input.",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  if (parsed.data.agentId && parsed.data.agentId !== authenticatedAgent.id) {
    return NextResponse.json(
      { error: "Authenticated agent cannot create requests for another agent." },
      { status: 403 }
    );
  }

  const input = {
    ...parsed.data,
    agentId: authenticatedAgent.id
  };
  const agent = await prisma.agent.findUnique({
    where: { id: input.agentId },
    include: {
      company: true,
      policy: true
    }
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found." }, { status: 404 });
  }

  if (!agent.policy) {
    return NextResponse.json({ error: "Agent has no policy." }, { status: 422 });
  }

  const policy = agent.policy;
  const vendor = await prisma.vendor.findUnique({
    where: { id: input.vendorId }
  });

  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
  }

  if (vendor.companyId !== agent.companyId || policy.companyId !== agent.companyId) {
    return NextResponse.json(
      { error: "Agent, vendor, and policy must belong to the same company." },
      { status: 422 }
    );
  }

  if (agent.frozenAt || agent.company.frozenAt) {
    const frozenResult = await createFrozenPaymentRequest({
      agent,
      vendor,
      input,
      reason:
        agent.freezeReason ??
        agent.company.freezeReason ??
        "Spend is frozen by OperatorLayer controls."
    });

    return NextResponse.json(frozenResult, { status: 201 });
  }

  const idempotencyKey = request.headers.get("idempotency-key");
  const requestHash = hashPaymentRequest(input);

  if (idempotencyKey) {
    const existingKey = await prisma.idempotencyKey.findUnique({
      where: {
        companyId_key: {
          companyId: authenticatedAgent.companyId,
          key: idempotencyKey
        }
      }
    });

    if (existingKey) {
      if (existingKey.requestHash !== requestHash) {
        return NextResponse.json(
          { error: "Idempotency key was already used for a different request." },
          { status: 409 }
        );
      }

      if (existingKey.responseBody) {
        return NextResponse.json(JSON.parse(existingKey.responseBody), {
          status: 200
        });
      }
    }
  }

  const recentRequests = await prisma.paymentRequest.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  const policyResult = evaluatePolicy({
    agentStatus: mapAgentStatus(agent.status),
    amountCents: input.amountCents,
    maxTransactionCents: policy.maxTransactionCents,
    weeklyBudgetCents: policy.weeklyBudgetCents,
    spentThisWeekCents: agent.spentThisWeekCents,
    vendorStatus: mapVendorStatus(vendor.status),
    category: input.category,
    allowedCategories: policy.allowedCategories.split("|"),
    requireApprovalForNewVendor: policy.requireApprovalForNewVendor
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
    recentRequestHistory: recentRequests.map((recentRequest) => ({
      vendorId: recentRequest.vendorId,
      agentId: recentRequest.agentId,
      amountCents: recentRequest.amountCents,
      status: mapStoredStatusToCore(recentRequest.status)
    })),
    metadata: {
      agentWeeklyBudgetCents: policy.weeklyBudgetCents,
      spentThisWeekCents: agent.spentThisWeekCents,
      maxTransactionCents: policy.maxTransactionCents,
      sensitiveCategories: input.metadata?.sensitiveCategories ?? ["Compute"],
      hasUnusualMetadata: input.metadata?.hasUnusualMetadata
    }
  });

  const paymentRequestId = `req_${crypto.randomUUID()}`;

  const transactionResult = await prisma.$transaction(async (tx) => {
    let finalStatus = getFinalStatus(policyResult.decision, riskResult.level);
    let reservationId: string | null = null;
    let reservationFailure: string | null = null;

    if (finalStatus !== "Blocked") {
      const reservationResult = await reserveBudget(tx, {
        agentId: agent.id,
        amountCents: input.amountCents,
        weeklyBudgetCents: policy.weeklyBudgetCents
      });

      if (reservationResult.ok) {
        reservationId = reservationResult.reservation.id;
      } else {
        finalStatus = "Blocked";
        reservationFailure = `${reservationResult.reason}: ${reservationResult.availableCents} cents available.`;
      }
    }

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

    if (reservationId) {
      await tx.spendReservation.update({
        where: { id: reservationId },
        data: { paymentRequestId }
      });
    }

    if (idempotencyKey) {
      await tx.idempotencyKey.create({
        data: {
          id: `idem_${crypto.randomUUID()}`,
          companyId: agent.companyId,
          agentId: agent.id,
          paymentRequestId,
          key: idempotencyKey,
          requestHash
        }
      });
    }

    await appendAuditLog(tx, {
      companyId: agent.companyId,
      paymentRequestId,
      actor: "agent-authenticator",
      action: "AGENT_AUTHENTICATED",
      target: agent.id,
      detail: `Authenticated ${agent.name} for spend authorization.`
    });

    await appendAuditLog(tx, {
      companyId: agent.companyId,
      paymentRequestId,
      actor: "payment-request-api",
      action: "REQUEST_CREATED",
      target: paymentRequestId,
      detail: `Payment request created for ${vendor.name}.`
    });

    await appendAuditLog(tx, {
      companyId: agent.companyId,
      paymentRequestId,
      actor: "policy-engine",
      action: "POLICY_EVALUATED",
      target: paymentRequestId,
      detail: `${policyResult.decision}: ${policyResult.reasons.join(", ")}`
    });

    await appendAuditLog(tx, {
      companyId: agent.companyId,
      paymentRequestId,
      actor: "risk-engine",
      action: "RISK_SCORED",
      target: paymentRequestId,
      detail: `${riskResult.level} risk (${riskResult.score}): ${riskResult.signals.join(", ")}`
    });

    if (reservationId) {
      await appendAuditLog(tx, {
        companyId: agent.companyId,
        paymentRequestId,
        actor: "budget-reservation",
        action: "BUDGET_RESERVED",
        target: reservationId,
        detail: `Reserved ${input.amountCents} cents for ${agent.name}.`
      });
    }

    if (reservationFailure) {
      await appendAuditLog(tx, {
        companyId: agent.companyId,
        paymentRequestId,
        actor: "budget-reservation",
        action: "BUDGET_RESERVATION_FAILED",
        target: paymentRequestId,
        detail: reservationFailure
      });
    }

    if (finalStatus !== "Executed") {
      await appendAuditLog(tx, {
        companyId: agent.companyId,
        paymentRequestId,
        actor: "payment-request-api",
        action: finalStatus === "Needs approval" ? "ROUTED_FOR_APPROVAL" : "REQUEST_BLOCKED",
        target: paymentRequestId,
        detail: `Final status: ${finalStatus}.`
      });

      await evaluateAndPersistBreaker(tx, {
        agentId: agent.id,
        companyId: agent.companyId,
        paymentRequestId,
        amountCents: input.amountCents,
        maxTransactionCents: policy.maxTransactionCents
      });

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

    if (reservationId) {
      const reservation = await tx.spendReservation.update({
        where: { id: reservationId },
        data: { state: ReservationState.CAPTURED }
      });

      await tx.agentBudgetPeriod.update({
        where: { id: reservation.budgetPeriodId },
        data: {
          reservedCents: {
            decrement: input.amountCents
          },
          spentCents: {
            increment: input.amountCents
          }
        }
      });
    }

    await appendAuditLog(tx, {
      companyId: agent.companyId,
      paymentRequestId,
      actor: "fake-payment-executor",
      action: "PAYMENT_SIMULATED",
      target: paymentRequestId,
      detail: `${fakePayment.fakeTransactionId} executed on ${fakePayment.rail} for ${fakePayment.asset}.`
    });

    await evaluateAndPersistBreaker(tx, {
      agentId: agent.id,
      companyId: agent.companyId,
      paymentRequestId,
      amountCents: input.amountCents,
      maxTransactionCents: policy.maxTransactionCents
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

  const responseBody = {
    ...transactionResult,
    auditLogs
  };

  if (idempotencyKey) {
    await prisma.idempotencyKey.update({
      where: {
        companyId_key: {
          companyId: agent.companyId,
          key: idempotencyKey
        }
      },
      data: {
        responseBody: JSON.stringify(responseBody)
      }
    });
  }

  return NextResponse.json(responseBody, { status: 201 });
}

function getFinalStatus(
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

function hashPaymentRequest(input: CreatePaymentRequestInput & { agentId: string }) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        agentId: input.agentId,
        vendorId: input.vendorId,
        amountCents: input.amountCents,
        category: input.category,
        metadata: input.metadata ?? null
      })
    )
    .digest("hex");
}

async function createFrozenPaymentRequest(input: {
  agent: {
    id: string;
    companyId: string;
    name: string;
    freezeReason: string | null;
    company: {
      frozenAt: Date | null;
      freezeReason: string | null;
    };
  };
  vendor: {
    id: string;
    name: string;
  };
  input: CreatePaymentRequestInput & { agentId: string };
  reason: string;
}) {
  const paymentRequestId = `req_${crypto.randomUUID()}`;
  const policyResult = {
    decision: "BLOCK",
    reasons: ["FROZEN"]
  };
  const riskResult = {
    score: 100,
    level: "HIGH",
    signals: ["FROZEN"]
  };

  const paymentRequest = await prisma.$transaction(async (tx) => {
    const createdRequest = await tx.paymentRequest.create({
      data: {
        id: paymentRequestId,
        companyId: input.agent.companyId,
        agentId: input.agent.id,
        vendorId: input.vendor.id,
        category: input.input.category,
        amountCents: input.input.amountCents,
        status: "Blocked",
        policyDecision: "BLOCK",
        riskLevel: "Frozen",
        riskScore: 100
      },
      include: {
        agent: true,
        vendor: true
      }
    });

    await appendAuditLog(tx, {
      companyId: input.agent.companyId,
      paymentRequestId,
      actor: "kill-switch",
      action: "REQUEST_BLOCKED_FROZEN",
      target: input.agent.id,
      detail: `Spend request blocked because spend is frozen: ${input.reason}`
    });

    return createdRequest;
  });

  const auditLogs = await prisma.auditLog.findMany({
    where: { paymentRequestId },
    orderBy: { createdAt: "asc" }
  });

  return {
    paymentRequest,
    policyResult,
    riskResult,
    fakePayment: null,
    auditLogs
  };
}

async function evaluateAndPersistBreaker(
  tx: Prisma.TransactionClient,
  input: {
    agentId: string;
    companyId: string;
    paymentRequestId: string;
    amountCents: number;
    maxTransactionCents: number;
  }
) {
  const now = new Date();
  const historyWindowMinutes =
    breakerConfig.blockedWindowMinutes + breakerConfig.velocityWindowMinutes;
  const historyWindowStart = new Date(
    now.getTime() - historyWindowMinutes * 60 * 1000
  );
  const [recentRequests, reservations, agent] = await Promise.all([
    tx.paymentRequest.findMany({
      where: {
        agentId: input.agentId,
        createdAt: {
          gte: historyWindowStart
        }
      },
      select: {
        status: true,
        createdAt: true
      }
    }),
    tx.spendReservation.findMany({
      where: {
        agentId: input.agentId,
        createdAt: {
          gte: historyWindowStart
        }
      },
      select: {
        amountCents: true,
        createdAt: true
      }
    }),
    tx.agent.findUnique({
      where: { id: input.agentId },
      select: {
        frozenAt: true
      }
    })
  ]);

  if (agent?.frozenAt) {
    return null;
  }

  const breakerResult = evaluateBreaker({
    now,
    currentRequestAmountCents: input.amountCents,
    maxTransactionCents: input.maxTransactionCents,
    recentRequests,
    reservations
  });

  if (!breakerResult.tripped) {
    return null;
  }

  await tx.agent.update({
    where: { id: input.agentId },
    data: {
      frozenAt: now,
      freezeReason: breakerResult.detail
    }
  });

  const anomalyEvent = await tx.spendAnomalyEvent.create({
    data: {
      id: `anom_${crypto.randomUUID()}`,
      companyId: input.companyId,
      agentId: input.agentId,
      kind: breakerResult.kind,
      detail: breakerResult.detail,
      createdAt: now
    }
  });

  await appendAuditLog(tx, {
    companyId: input.companyId,
    paymentRequestId: input.paymentRequestId,
    actor: "circuit-breaker",
    action: "CIRCUIT_BREAKER_TRIPPED",
    target: input.agentId,
    detail: `${anomalyEvent.kind}: ${anomalyEvent.detail}`
  });

  return anomalyEvent;
}
