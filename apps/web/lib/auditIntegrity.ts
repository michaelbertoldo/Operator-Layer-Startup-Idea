import { createHash } from "node:crypto";

export type AuditIntegrityLog = {
  id: string;
  companyId: string;
  paymentRequestId: string | null;
  actor: string;
  action: string;
  target: string;
  detail: string;
  prevHash: string | null;
  hash: string;
  createdAt: Date;
};

export type AuditIntegrityIssue = {
  logId: string;
  action: string;
  issue: "PREV_HASH_MISMATCH" | "HASH_MISMATCH";
  expected: string | null;
  actual: string | null;
};

export type AuditIntegrityResult = {
  valid: boolean;
  checkedCount: number;
  firstHash: string | null;
  latestHash: string | null;
  issues: AuditIntegrityIssue[];
};

export function verifyAuditChain(
  logs: AuditIntegrityLog[]
): AuditIntegrityResult {
  const issues: AuditIntegrityIssue[] = [];
  let previousHash: string | null = null;

  for (const log of logs) {
    if (log.prevHash !== previousHash) {
      issues.push({
        logId: log.id,
        action: log.action,
        issue: "PREV_HASH_MISMATCH",
        expected: previousHash,
        actual: log.prevHash
      });
    }

    const expectedHash = hashAuditLog(log);
    if (log.hash !== expectedHash) {
      issues.push({
        logId: log.id,
        action: log.action,
        issue: "HASH_MISMATCH",
        expected: expectedHash,
        actual: log.hash
      });
    }

    previousHash = log.hash;
  }

  return {
    valid: issues.length === 0,
    checkedCount: logs.length,
    firstHash: logs[0]?.hash ?? null,
    latestHash: logs.at(-1)?.hash ?? null,
    issues
  };
}

export function hashAuditLog(log: AuditIntegrityLog) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        id: log.id,
        companyId: log.companyId,
        paymentRequestId: log.paymentRequestId ?? null,
        actor: log.actor,
        action: log.action,
        target: log.target,
        detail: log.detail,
        prevHash: log.prevHash,
        createdAt: log.createdAt.toISOString()
      })
    )
    .digest("hex");
}
