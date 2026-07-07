import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";

type AppendAuditLogInput = {
  companyId: string;
  paymentRequestId?: string | null;
  actor: string;
  action: string;
  target: string;
  detail: string;
};

export async function appendAuditLog(
  tx: Prisma.TransactionClient,
  input: AppendAuditLogInput
) {
  const previous = await tx.auditLog.findFirst({
    where: {
      companyId: input.companyId
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const prevHash = previous?.hash ?? null;
  const now = new Date();
  const createdAt =
    previous && now.getTime() <= previous.createdAt.getTime()
      ? new Date(previous.createdAt.getTime() + 1)
      : now;
  const id = `aud_${crypto.randomUUID()}`;
  const hash = hashAuditEvent({
    id,
    prevHash,
    createdAt,
    ...input
  });

  return tx.auditLog.create({
    data: {
      id,
      companyId: input.companyId,
      paymentRequestId: input.paymentRequestId ?? null,
      actor: input.actor,
      action: input.action,
      target: input.target,
      detail: input.detail,
      prevHash,
      hash,
      createdAt
    }
  });
}

function hashAuditEvent(input: AppendAuditLogInput & {
  id: string;
  prevHash: string | null;
  createdAt: Date;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        id: input.id,
        companyId: input.companyId,
        paymentRequestId: input.paymentRequestId ?? null,
        actor: input.actor,
        action: input.action,
        target: input.target,
        detail: input.detail,
        prevHash: input.prevHash,
        createdAt: input.createdAt.toISOString()
      })
    )
    .digest("hex");
}
