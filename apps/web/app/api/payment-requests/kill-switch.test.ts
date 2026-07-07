import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { POST as controlsPost } from "@/app/api/controls/route";
import { POST as paymentPost } from "@/app/api/payment-requests/route";
import { breakerConfig } from "@/lib/circuitBreaker";
import { hashApiKey } from "@/lib/authenticateAgent";
import { prisma } from "@/lib/prisma";

const createdCompanyIds = new Set<string>();

describe("kill switch and circuit breaker", () => {
  afterEach(async () => {
    for (const companyId of createdCompanyIds) {
      await deleteFixtureCompany(companyId);
    }

    createdCompanyIds.clear();
  });

  it("returns BLOCKED/FROZEN for a frozen agent and reserves no budget", async () => {
    const fixture = await createFixture("frozen_agent", {
      agentFrozen: true
    });

    const response = await paymentPost(
      paymentRequest(fixture, "idem_frozen_agent")
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.paymentRequest.status).toBe("Blocked");
    expect(payload.paymentRequest.riskLevel).toBe("Frozen");
    expect(payload.policyResult.reasons).toEqual(["FROZEN"]);

    await expect(
      prisma.spendReservation.count({
        where: { agentId: fixture.agentId }
      })
    ).resolves.toBe(0);
    await expectValidAuditChain(fixture.companyId);
  });

  it("company freeze overrides an unfrozen agent", async () => {
    const fixture = await createFixture("company_frozen", {
      companyFrozen: true
    });

    const response = await paymentPost(
      paymentRequest(fixture, "idem_company_frozen")
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.paymentRequest.status).toBe("Blocked");
    expect(payload.paymentRequest.riskLevel).toBe("Frozen");
    await expectValidAuditChain(fixture.companyId);
  });

  it("trips after more than N blocked requests in the window", async () => {
    const fixture = await createFixture("breaker_burst");
    const now = new Date();

    await prisma.paymentRequest.createMany({
      data: Array.from(
        { length: breakerConfig.blockedRequestLimit + 1 },
        (_, index) => ({
          id: `${fixture.id}_blocked_${index}`,
          companyId: fixture.companyId,
          agentId: fixture.agentId,
          vendorId: fixture.vendorId,
          category: "Research",
          amountCents: 100,
          status: "Blocked",
          policyDecision: "BLOCK",
          riskLevel: "High",
          riskScore: 90,
          createdAt: new Date(now.getTime() - index * 60_000)
        })
      )
    });

    const response = await paymentPost(
      paymentRequest(fixture, "idem_breaker_burst")
    );

    expect(response.status).toBe(201);
    await expect(
      prisma.agent.findUniqueOrThrow({ where: { id: fixture.agentId } })
    ).resolves.toMatchObject({
      freezeReason: expect.stringContaining("blocked requests")
    });
    await expect(
      prisma.spendAnomalyEvent.count({
        where: { agentId: fixture.agentId, kind: "BLOCKED_REQUEST_BURST" }
      })
    ).resolves.toBe(1);
    await expectValidAuditChain(fixture.companyId);
  });

  it("unfreeze clears frozenAt and lets the next request through", async () => {
    const fixture = await createFixture("unfreeze_agent", {
      agentFrozen: true
    });

    const controlsResponse = await controlsPost(
      controlRequest(fixture, {
        scope: "agent",
        action: "unfreeze",
        agentId: fixture.agentId
      })
    );

    expect(controlsResponse.status).toBe(200);

    const response = await paymentPost(
      paymentRequest(fixture, "idem_unfreeze_agent")
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.paymentRequest.status).toBe("Executed");
    await expect(
      prisma.agent.findUniqueOrThrow({ where: { id: fixture.agentId } })
    ).resolves.toMatchObject({
      frozenAt: null,
      freezeReason: null
    });
    await expectValidAuditChain(fixture.companyId);
  });

  it("manual freeze and unfreeze append valid audit-chain entries", async () => {
    const fixture = await createFixture("manual_controls");

    await controlsPost(
      controlRequest(fixture, {
        scope: "company",
        action: "freeze",
        reason: "Test freeze."
      })
    );
    await controlsPost(
      controlRequest(fixture, {
        scope: "company",
        action: "unfreeze",
        reason: "Test unfreeze."
      })
    );

    await expectValidAuditChain(fixture.companyId);
  });
});

type Fixture = {
  id: string;
  apiKey: string;
  companyId: string;
  agentId: string;
  vendorId: string;
};

async function createFixture(
  id: string,
  options: {
    agentFrozen?: boolean;
    companyFrozen?: boolean;
  } = {}
): Promise<Fixture> {
  const fixture = {
    id: `test_${id}`,
    apiKey: `test_key_${id}`,
    companyId: `test_cmp_${id}`,
    agentId: `test_agt_${id}`,
    vendorId: `test_vnd_${id}`
  };
  const frozenAt = new Date("2026-07-03T12:00:00.000Z");

  createdCompanyIds.add(fixture.companyId);
  await deleteFixtureCompany(fixture.companyId);

  await prisma.company.create({
    data: {
      id: fixture.companyId,
      name: `Test Company ${id}`,
      environment: "Fake-money test",
      paymentExecutor: "FAKE_X402",
      frozenAt: options.companyFrozen ? frozenAt : null,
      freezeReason: options.companyFrozen ? "Company test freeze." : null
    }
  });
  await prisma.policy.create({
    data: {
      id: `test_pol_${id}`,
      companyId: fixture.companyId,
      name: `Test Policy ${id}`,
      maxTransactionCents: 5_000,
      weeklyBudgetCents: 100_000,
      approvalThresholdCents: 10_000,
      allowedCategories: "Research|Data enrichment",
      requireApprovalForNewVendor: true
    }
  });
  await prisma.agent.create({
    data: {
      id: fixture.agentId,
      companyId: fixture.companyId,
      policyId: `test_pol_${id}`,
      name: `Test Agent ${id}`,
      status: "Active",
      ownerName: "Test Owner",
      weeklyBudgetCents: 100_000,
      spentThisWeekCents: 0,
      approvedVendorCount: 1,
      riskLevel: "Low",
      frozenAt: options.agentFrozen ? frozenAt : null,
      freezeReason: options.agentFrozen ? "Agent test freeze." : null
    }
  });
  await prisma.agentApiKey.create({
    data: {
      id: `test_key_${id}`,
      agentId: fixture.agentId,
      name: `Test key ${id}`,
      keyHash: hashApiKey(fixture.apiKey),
      keyPrefix: fixture.apiKey.slice(0, 8)
    }
  });
  await prisma.vendor.create({
    data: {
      id: fixture.vendorId,
      companyId: fixture.companyId,
      name: `Test Vendor ${id}`,
      category: "Research",
      status: "Approved",
      requestCount: 0,
      simulatedSpendCents: 0
    }
  });

  return fixture;
}

function paymentRequest(fixture: Fixture, idempotencyKey: string) {
  return new Request("http://operatorlayer.test/api/payment-requests", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${fixture.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify({
      agentId: fixture.agentId,
      vendorId: fixture.vendorId,
      amountCents: 1_000,
      category: "Research"
    })
  });
}

function controlRequest(
  fixture: Fixture,
  body: {
    scope: "agent" | "company";
    action: "freeze" | "unfreeze";
    agentId?: string;
    reason?: string;
  }
) {
  return new Request("http://operatorlayer.test/api/controls", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${fixture.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

async function expectValidAuditChain(companyId: string) {
  const logs = await prisma.auditLog.findMany({
    where: { companyId },
    orderBy: { createdAt: "asc" }
  });

  expect(logs.length).toBeGreaterThan(0);

  let prevHash: string | null = null;
  for (const log of logs) {
    expect(log.prevHash).toBe(prevHash);
    const hash = createHash("sha256")
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

    expect(log.hash).toBe(hash);
    prevHash = log.hash;
  }
}

async function deleteFixtureCompany(companyId: string) {
  await prisma.auditLog.deleteMany({ where: { companyId } });
  await prisma.spendAnomalyEvent.deleteMany({ where: { companyId } });
  await prisma.idempotencyKey.deleteMany({ where: { companyId } });
  await prisma.spendReservation.deleteMany({
    where: {
      agent: {
        companyId
      }
    }
  });
  await prisma.agentBudgetPeriod.deleteMany({
    where: {
      agent: {
        companyId
      }
    }
  });
  await prisma.paymentRequest.deleteMany({ where: { companyId } });
  await prisma.agentApiKey.deleteMany({
    where: {
      agent: {
        companyId
      }
    }
  });
  await prisma.agent.deleteMany({ where: { companyId } });
  await prisma.vendor.deleteMany({ where: { companyId } });
  await prisma.policy.deleteMany({ where: { companyId } });
  await prisma.company.deleteMany({ where: { id: companyId } });
}
