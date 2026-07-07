"use server";

import { fakePaymentExecutor } from "@operatorlayer/core";
import { ReservationState } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appendAuditLog } from "@/lib/appendAuditLog";
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
      vendor: true,
      reservation: true
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
    if (request.reservation?.state === ReservationState.ACTIVE) {
      const reservation = await tx.spendReservation.update({
        where: { id: request.reservation.id },
        data: { state: ReservationState.CAPTURED }
      });

      await tx.agentBudgetPeriod.update({
        where: { id: reservation.budgetPeriodId },
        data: {
          reservedCents: {
            decrement: reservation.amountCents
          },
          spentCents: {
            increment: reservation.amountCents
          }
        }
      });

      await appendAuditLog(tx, {
        companyId: request.companyId,
        paymentRequestId: request.id,
        actor: "budget-reservation",
        action: "BUDGET_CAPTURED",
        target: reservation.id,
        detail: `Captured ${reservation.amountCents} reserved cents after human approval.`
      });
    }

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

    await appendAuditLog(tx, {
      companyId: request.companyId,
      paymentRequestId: request.id,
      actor: "approval-workflow",
      action: "APPROVAL_APPROVED",
      target: request.id,
      detail: `Human approval executed simulated spend for ${request.vendor.name}.`
    });

    await appendAuditLog(tx, {
      companyId: request.companyId,
      paymentRequestId: request.id,
      actor: "fake-payment-executor",
      action: "PAYMENT_SIMULATED",
      target: request.id,
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
      vendor: true,
      reservation: true
    }
  });

  if (!request) {
    redirectWithMessage("error", "Payment request not found.");
  }

  if (request.status !== "Needs approval") {
    redirectWithMessage("error", "Payment request is no longer pending approval.");
  }

  await prisma.$transaction(async (tx) => {
    if (request.reservation?.state === ReservationState.ACTIVE) {
      const reservation = await tx.spendReservation.update({
        where: { id: request.reservation.id },
        data: { state: ReservationState.RELEASED }
      });

      await tx.agentBudgetPeriod.update({
        where: { id: reservation.budgetPeriodId },
        data: {
          reservedCents: {
            decrement: reservation.amountCents
          }
        }
      });

      await appendAuditLog(tx, {
        companyId: request.companyId,
        paymentRequestId: request.id,
        actor: "budget-reservation",
        action: "BUDGET_RELEASED",
        target: reservation.id,
        detail: `Released ${reservation.amountCents} reserved cents after human rejection.`
      });
    }

    await tx.paymentRequest.update({
      where: { id: request.id },
      data: {
        status: "Blocked"
      }
    });

    await appendAuditLog(tx, {
      companyId: request.companyId,
      paymentRequestId: request.id,
      actor: "approval-workflow",
      action: "APPROVAL_REJECTED",
      target: request.id,
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
