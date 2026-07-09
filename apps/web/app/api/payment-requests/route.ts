/**
 * route.ts — POST /api/payment-requests
 *
 * The full hardened flow. Order matters:
 *   1. authenticate the agent      (prove identity, don't trust the body)
 *   2. idempotency short-circuit    (retried call → return the original result)
 *   3. policy + risk                (deterministic decision)
 *   4. reserve budget atomically    (only if approved; no race)
 *   5. persist request + chained audit, execute fake payment or route to human
 *   6. release the hold if anything downstream fails
 *
 * Everything from step 3 on runs inside ONE db transaction so a crash can't
 * leave a half-committed spend.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { evaluatePolicy } from "@operatorlayer/core";
import { scoreRisk } from "@operatorlayer/core";
import { fakePaymentExecutor } from "@operatorlayer/core";
import { authenticateAgent } from "@/lib/authenticateAgent";
import { reserveBudget, releaseReservation, settleReservation } from "@/lib/reserveBudget";
import { appendAuditLog } from "@/lib/appendAuditLog";
import { isoWeekKey } from "@/lib/isoWeekKey";

const BodySchema = z.object({
  vendorId: z.string(),
  category: z.string(),
  amountCents: z.number().int().positive(),
  purpose: z.string().nullish(),
  idempotencyKey: z.string().min(8),
});

export async function POST(req: Request) {
  // ── 1. authenticate ────────────────────────────────────────────────────────
  const agent = await authenticateAgent(prisma, req.headers.get("authorization"));
  if (!agent) {
    return NextResponse.json({ error: "invalid or revoked agent key" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body", issues: parsed.error.issues }, { status: 400 });
  }
  const body = parsed.data;

  // ── 2. idempotency short-circuit ────────────────────────────────────────────
  const existing = await prisma.idempotencyKey.findUnique({
    where: { agentId_key: { agentId: agent.agentId, key: body.idempotencyKey } },
    select: { paymentRequestId: true },
  });
  if (existing) {
    return NextResponse.json(await loadDecision(existing.paymentRequestId));
  }

  // Load the agent's config + this period's usage.
  const agentRow = await prisma.agent.findUniqueOrThrow({
    where: { id: agent.agentId },
    include: { policy: true, company: true },
  });
  if (!agentRow.policy) {
    return NextResponse.json({ error: "Agent has no policy configured" }, { status: 422 });
  }
  const vendor = await prisma.vendor.findUniqueOrThrow({ where: { id: body.vendorId } });
  const periodKey = isoWeekKey(new Date());
  const period = await prisma.agentBudgetPeriod.findUnique({
    where: { agentId_periodKey: { agentId: agent.agentId, periodKey } },
  });
  const spentThisWeekCents = period?.heldCents ?? 0;

  // ── 3. policy + risk ────────────────────────────────────────────────────────
  const policyResult = evaluatePolicy({
    agentStatus: agentRow.status as "ACTIVE" | "PAUSED" | "DISABLED",
    amountCents: body.amountCents,
    maxTransactionCents: agentRow.policy.maxTransactionCents,
    weeklyBudgetCents: agentRow.policy.weeklyBudgetCents,
    spentThisWeekCents,
    vendorStatus: vendor.status as "APPROVED" | "PENDING" | "NEW" | "BLOCKED",
    category: body.category,
    allowedCategories: agentRow.policy.allowedCategories.split("|"),
    requireApprovalForNewVendor: agentRow.policy.requireApprovalForNewVendor,
  });

  const riskResult = scoreRisk({
    paymentRequest: { amountCents: body.amountCents, category: body.category, vendorId: vendor.id, agentId: agent.agentId },
    vendor: { id: vendor.id, status: vendor.status as any, previousApprovedRequestCount: vendor.requestCount ?? 0 },
    recentRequestHistory: [], // TODO: pass timestamped window (see critique)
    metadata: {
      agentWeeklyBudgetCents: agentRow.policy.weeklyBudgetCents,
      spentThisWeekCents,
      maxTransactionCents: agentRow.policy.maxTransactionCents,
      sensitiveCategories: agentRow.policy.sensitiveCategories?.split("|") ?? [],
    },
  });

  const finalStatus = combineDecision(policyResult.decision, riskResult.level);

  // ── 4–5. reserve + persist, all atomic ──────────────────────────────────────
  const result = await prisma.$transaction(async (tx) => {
    const paymentRequestId = "req_" + crypto.randomUUID().replace(/-/g, "");

    // Snapshot the policy as it was NOW, so "why did this pass last Tuesday?" is
    // answerable even after the policy changes.
    const policySnapshot = JSON.stringify(agentRow.policy);

    let reservationId: string | null = null;
    let statusToStore = finalStatus;

    // Only approvals and pending-approvals hold budget. Blocks hold nothing.
    if (finalStatus === "EXECUTED" || finalStatus === "NEEDS_APPROVAL") {
      const reservation = await reserveBudget(tx, {
        agentId: agent.agentId,
        periodKey,
        limitCents: agentRow.policy!.weeklyBudgetCents,
        amountCents: body.amountCents,
        paymentRequestId,
      });
      if (!reservation.ok) {
        statusToStore = "BLOCKED"; // budget filled between check and reserve
      } else {
        reservationId = reservation.reservationId;
      }
    }

    await tx.paymentRequest.create({
      data: {
        id: paymentRequestId,
        companyId: agentRow.companyId,
        agentId: agent.agentId,
        vendorId: vendor.id,
        category: body.category,
        amountCents: body.amountCents,
        status: statusToStore,
        policyDecision: policyResult.decision,
        riskLevel: riskResult.level,
        riskScore: riskResult.score,
        policySnapshot,
      },
    });

    await tx.idempotencyKey.create({
      data: {
        id: `idem_${crypto.randomUUID().replace(/-/g, "")}`,
        agentId: agent.agentId,
        key: body.idempotencyKey,
        paymentRequestId
      },
    });

    for (const [actor, action, detail] of auditEvents(policyResult, riskResult, statusToStore, vendor.name)) {
      await appendAuditLog(tx, { companyId: agentRow.companyId, paymentRequestId, actor, action, target: paymentRequestId, detail });
    }

    // Execute the fake payment for clean auto-approvals; settle the hold.
    if (statusToStore === "EXECUTED" && reservationId) {
      const receipt = fakePaymentExecutor({
        paymentRequestId,
        amountCents: body.amountCents,
      });
      await settleReservation(tx, reservationId);
      await appendAuditLog(tx, {
        companyId: agentRow.companyId,
        paymentRequestId,
        actor: "fake-payment-executor",
        action: "PAYMENT_SIMULATED",
        target: paymentRequestId,
        detail: `Fake tx ${receipt.fakeTransactionId} on ${receipt.rail}.`,
      });
    }

    // If budget filled the hold, release it (nothing to spend).
    if (statusToStore === "BLOCKED" && reservationId) {
      await releaseReservation(tx, reservationId);
    }

    return { paymentRequestId, statusToStore, reservationId };
  });

  return NextResponse.json(await loadDecision(result.paymentRequestId));
}

// ── helpers ──────────────────────────────────────────────────────────────────

function combineDecision(
  policy: "AUTO_APPROVE" | "NEEDS_APPROVAL" | "BLOCK",
  risk: "LOW" | "MEDIUM" | "HIGH",
): "EXECUTED" | "NEEDS_APPROVAL" | "BLOCKED" {
  if (policy === "BLOCK") return "BLOCKED";
  if (risk === "HIGH") return "BLOCKED"; // risk can veto a policy pass
  if (policy === "NEEDS_APPROVAL" || risk === "MEDIUM") return "NEEDS_APPROVAL";
  return "EXECUTED";
}

function auditEvents(
  policy: { decision: string; reasons: string[] },
  risk: { level: string; score: number; signals: string[] },
  finalStatus: string,
  vendorName: string,
): Array<[string, string, string]> {
  return [
    ["payment-request-api", "REQUEST_CREATED", `Request for ${vendorName}.`],
    ["policy-engine", "POLICY_EVALUATED", `${policy.decision}: ${policy.reasons.join(", ")}`],
    ["risk-engine", "RISK_SCORED", `${risk.level} (${risk.score}): ${risk.signals.join(", ")}`],
    ["payment-request-api", "FINAL_DECISION", `Final status ${finalStatus}.`],
  ];
}

async function loadDecision(paymentRequestId: string) {
  const r = await prisma.paymentRequest.findUniqueOrThrow({
    where: { id: paymentRequestId },
    select: { id: true, status: true, policyDecision: true, riskLevel: true, riskScore: true },
  });
  return {
    paymentRequestId: r.id,
    finalStatus: r.status,
    decision: r.policyDecision,
    risk: { level: r.riskLevel, score: r.riskScore, signals: [] as string[] },
    policyReasons: [] as string[],
  };
}
