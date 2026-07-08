/**
 * appendAuditLog.ts — tamper-evident audit trail via a hash chain.
 *
 * Each row stores hash = sha256(prevHash + canonical(row)). Change any historical
 * row and every subsequent hash breaks, so tampering is detectable. ~20 lines,
 * and it lets you say "cryptographically verifiable audit trail" — honestly.
 *
 * This is per-company chain. `verifyAuditChain` recomputes and reports the first
 * broken link (wire it to a "Verify integrity" button in the dashboard).
 */

import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export type AuditInput = {
  companyId: string;
  paymentRequestId?: string | null;
  actor: string;
  action: string;
  target: string;
  detail: string;
};

/** Append one event, chaining it to the company's most recent event. */
export async function appendAuditLog(db: Db, input: AuditInput): Promise<void> {
  const prev = await db.auditLog.findFirst({
    where: { companyId: input.companyId },
    orderBy: { createdAt: "desc" },
    select: { hash: true },
  });
  const prevHash = prev?.hash ?? "GENESIS";
  const createdAt = new Date();

  const hash = hashRow(prevHash, { ...input, createdAt });

  await db.auditLog.create({
    data: {
      id: `aud_${crypto.randomUUID().replace(/-/g, "")}`,
      companyId: input.companyId,
      paymentRequestId: input.paymentRequestId ?? null,
      actor: input.actor,
      action: input.action,
      target: input.target,
      detail: input.detail,
      createdAt,
      prevHash,
      hash,
    },
  });
}

/** Recompute the chain; returns the id of the first tampered row, or null. */
export async function verifyAuditChain(
  db: PrismaClient,
  companyId: string,
): Promise<{ ok: true } | { ok: false; brokenAtId: string }> {
  const rows = await db.auditLog.findMany({
    where: { companyId },
    orderBy: { createdAt: "asc" },
  });
  let prevHash = "GENESIS";
  for (const r of rows) {
    const expected = hashRow(prevHash, r);
    if (r.prevHash !== prevHash || r.hash !== expected) {
      return { ok: false, brokenAtId: r.id };
    }
    prevHash = r.hash;
  }
  return { ok: true };
}

function hashRow(
  prevHash: string,
  r: { companyId: string; paymentRequestId?: string | null; actor: string; action: string; target: string; detail: string; createdAt: Date },
): string {
  // Canonical, order-stable serialization. Any field change alters the hash.
  const canonical = JSON.stringify([
    r.companyId,
    r.paymentRequestId ?? "",
    r.actor,
    r.action,
    r.target,
    r.detail,
    r.createdAt.toISOString(),
  ]);
  return createHash("sha256").update(prevHash + "|" + canonical).digest("hex");
}
