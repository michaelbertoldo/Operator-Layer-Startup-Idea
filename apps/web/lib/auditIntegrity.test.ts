import { describe, expect, it } from "vitest";
import { hashAuditLog, verifyAuditChain, type AuditIntegrityLog } from "./auditIntegrity";

describe("verifyAuditChain", () => {
  it("validates a correct hash chain", () => {
    const logs = buildLogs();

    expect(verifyAuditChain(logs)).toMatchObject({
      valid: true,
      checkedCount: 2,
      issues: []
    });
  });

  it("reports previous hash mismatches", () => {
    const logs = buildLogs();
    logs[1] = {
      ...logs[1],
      prevHash: "wrong"
    };

    expect(verifyAuditChain(logs).issues).toEqual([
      expect.objectContaining({
        logId: "aud_2",
        issue: "PREV_HASH_MISMATCH"
      }),
      expect.objectContaining({
        logId: "aud_2",
        issue: "HASH_MISMATCH"
      })
    ]);
  });

  it("reports payload hash mismatches", () => {
    const logs = buildLogs();
    logs[0] = {
      ...logs[0],
      detail: "tampered detail"
    };

    expect(verifyAuditChain(logs).issues).toEqual([
      expect.objectContaining({
        logId: "aud_1",
        issue: "HASH_MISMATCH"
      })
    ]);
  });
});

function buildLogs() {
  const first: AuditIntegrityLog = {
    id: "aud_1",
    companyId: "cmp_test",
    paymentRequestId: null,
    actor: "controls",
    action: "FREEZE",
    target: "cmp_test",
    detail: "Company spend frozen.",
    prevHash: null,
    hash: "",
    createdAt: new Date("2026-07-04T12:00:00.000Z")
  };
  first.hash = hashAuditLog(first);

  const second: AuditIntegrityLog = {
    id: "aud_2",
    companyId: "cmp_test",
    paymentRequestId: "req_1",
    actor: "policy-engine",
    action: "POLICY_EVALUATED",
    target: "req_1",
    detail: "AUTO_APPROVE",
    prevHash: first.hash,
    hash: "",
    createdAt: new Date("2026-07-04T12:00:01.000Z")
  };
  second.hash = hashAuditLog(second);

  return [first, second];
}
