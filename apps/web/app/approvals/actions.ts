"use server";

import { fakePaymentExecutor } from "@operatorlayer/core";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function approvePaymentRequestAction(formData: FormData) {
  const requestId = getRequestId(formData);

  if (!requestId) {
    redirectWithMessage("error", "Missing payment request id.");
  }

  const request = await prisma.paymentRequest.findUnique({
    where: { id: requestId },
    include: {
      agent: true,
      vendor: true
    }
  });

  if (!request) {
    redirectWithMessage("error", "Payment request not found.");
  }

  if (request.status !== "Needs approval") {
    redirectWithMessage("error", "Payment request is no longer pending approval.");
  }

  const fakePayment = fakePaymentExecutor({
    paymentRequestId: request.id,
    amountCents: request.amountCents
  });

  await prisma.$transaction(async (tx) => {
    await tx.paymentRequest.update({
      where: { id: request.id },
      data: {
        status: "Executed",
        fakeTransactionId: fakePayment.fakeTransactionId,
        fakeRail: fakePayment.rail,
        fakeAsset: fakePayment.asset,
        executedAt: fakePayment.executedAt
      }
    });

    await tx.agent.update({
      where: { id: request.agentId },
      data: {
        spentThisWeekCents: {
          increment: request.amountCents
        }
      }
    });

    await tx.vendor.update({
      where: { id: request.vendorId },
      data: {
        requestCount: {
          increment: 1
        },
        simulatedSpendCents: {
          increment: request.amountCents
        }
      }
    });

    await createApprovalAuditLog(tx, {
      companyId: request.companyId,
      paymentRequestId: request.id,
      actor: "approval-workflow",
      action: "APPROVAL_APPROVED",
      detail: `Human approval executed simulated spend for ${request.vendor.name}.`
    });

    await createApprovalAuditLog(tx, {
      companyId: request.companyId,
      paymentRequestId: request.id,
      actor: "fake-payment-executor",
      action: "PAYMENT_SIMULATED",
      detail: `${fakePayment.fakeTransactionId} executed on ${fakePayment.rail} for ${fakePayment.asset}.`
    });
  });

  revalidatePath("/approvals");
  revalidatePath("/requests");
  revalidatePath("/audit");
  revalidatePath("/");
  redirectWithMessage("status", "Payment request approved and simulated.");
}

export async function rejectPaymentRequestAction(formData: FormData) {
  const requestId = getRequestId(formData);

  if (!requestId) {
    redirectWithMessage("error", "Missing payment request id.");
  }

  const request = await prisma.paymentRequest.findUnique({
    where: { id: requestId },
    include: {
      vendor: true
    }
  });

  if (!request) {
    redirectWithMessage("error", "Payment request not found.");
  }

  if (request.status !== "Needs approval") {
    redirectWithMessage("error", "Payment request is no longer pending approval.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.paymentRequest.update({
      where: { id: request.id },
      data: {
        status: "Blocked"
      }
    });

    await createApprovalAuditLog(tx, {
      companyId: request.companyId,
      paymentRequestId: request.id,
      actor: "approval-workflow",
      action: "APPROVAL_REJECTED",
      detail: `Human reviewer rejected simulated spend for ${request.vendor.name}.`
    });
  });

  revalidatePath("/approvals");
  revalidatePath("/requests");
  revalidatePath("/audit");
  revalidatePath("/");
  redirectWithMessage("status", "Payment request rejected.");
}

function getRequestId(formData: FormData) {
  const value = formData.get("requestId");
  return typeof value === "string" ? value : "";
}

function redirectWithMessage(type: "error" | "status", message: string): never {
  redirect(`/approvals?${type}=${encodeURIComponent(message)}`);
}

async function createApprovalAuditLog(
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
