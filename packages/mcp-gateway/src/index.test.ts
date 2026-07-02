import { describe, expect, it } from "vitest";
import {
  checkRemainingBudget,
  requestHumanApproval,
  requestPaidApiCall
} from "./index";

describe("mcp-gateway", () => {
  it("posts paid API call requests to the web payment request API", async () => {
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("http://operatorlayer.test/api/payment-requests");
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toEqual({
        agentId: "agt_research",
        vendorId: "vnd_clearbit",
        amountCents: 1_200,
        category: "Data enrichment"
      });

      return jsonResponse({
        paymentRequest: {
          id: "req_demo",
          status: "Executed",
          policyDecision: "AUTO_APPROVE",
          riskLevel: "Low",
          riskScore: 0,
          fakeTransactionId: "fake_txn_req_demo"
        },
        policyResult: {
          decision: "AUTO_APPROVE",
          reasons: ["POLICY_PASSED"]
        },
        riskResult: {
          score: 0,
          level: "LOW",
          signals: ["LOW_AMOUNT", "APPROVED_VENDOR"]
        },
        fakePayment: {
          fakeTransactionId: "fake_txn_req_demo",
          rail: "FAKE_X402",
          asset: "FAKE_USDC",
          amountCents: 1_200,
          executedAt: "2026-07-02T12:00:00.000Z"
        },
        auditLogs: []
      });
    };

    const result = await requestPaidApiCall(
      {
        agentId: "agt_research",
        vendorId: "vnd_clearbit",
        amountCents: 1_200,
        category: "Data enrichment"
      },
      {
        baseUrl: "http://operatorlayer.test",
        fetcher
      }
    );

    expect(result.paymentRequest.status).toBe("Executed");
    expect(result.fakePayment?.rail).toBe("FAKE_X402");
  });

  it("checks remaining budget through the payment request API", async () => {
    const fetcher = async (input: RequestInfo | URL) => {
      const url = new URL(String(input));

      expect(url.pathname).toBe("/api/payment-requests");
      expect(url.searchParams.get("agentId")).toBe("agt_research");

      return jsonResponse({
        agentId: "agt_research",
        weeklyBudgetCents: 120_000,
        spentThisWeekCents: 42_600,
        remainingBudgetCents: 77_400
      });
    };

    await expect(
      checkRemainingBudget("agt_research", {
        baseUrl: "http://operatorlayer.test/",
        fetcher
      })
    ).resolves.toEqual({
      agentId: "agt_research",
      weeklyBudgetCents: 120_000,
      spentThisWeekCents: 42_600,
      remainingBudgetCents: 77_400
    });
  });

  it("returns an approval URL for human authorization", async () => {
    await expect(
      requestHumanApproval("req_1041", {
        baseUrl: "http://operatorlayer.test"
      })
    ).resolves.toEqual({
      requestId: "req_1041",
      approvalUrl: "http://operatorlayer.test/approvals",
      message:
        "Payment request req_1041 requires human authorization in OperatorLayer Lite."
    });
  });

  it("throws API error responses", async () => {
    const fetcher = async () =>
      jsonResponse(
        {
          error: "Agent not found."
        },
        404
      );

    await expect(
      requestPaidApiCall(
        {
          agentId: "missing",
          vendorId: "vnd_clearbit",
          amountCents: 100,
          category: "Research"
        },
        { fetcher }
      )
    ).rejects.toThrow("Agent not found.");
  });
});

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

