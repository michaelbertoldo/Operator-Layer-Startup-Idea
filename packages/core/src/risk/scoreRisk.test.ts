import { describe, expect, it } from "vitest";
import { type ScoreRiskInput, scoreRisk } from "./scoreRisk";

const baseInput: ScoreRiskInput = {
  paymentRequest: {
    amountCents: 2_000,
    category: "Research",
    vendorId: "vnd_clearbit",
    agentId: "agt_research"
  },
  vendor: {
    id: "vnd_clearbit",
    status: "APPROVED",
    previousApprovedRequestCount: 12
  },
  recentRequestHistory: [
    {
      vendorId: "vnd_clearbit",
      agentId: "agt_research",
      amountCents: 1_500,
      status: "EXECUTED"
    }
  ],
  metadata: {
    agentWeeklyBudgetCents: 100_000,
    spentThisWeekCents: 20_000,
    maxTransactionCents: 10_000,
    sensitiveCategories: ["Compute"]
  }
};

describe("scoreRisk", () => {
  it("returns low risk for a small request to an approved vendor", () => {
    expect(scoreRisk(baseInput)).toEqual({
      score: 0,
      level: "LOW",
      signals: ["LOW_AMOUNT", "APPROVED_VENDOR"]
    });
  });

  it("returns medium risk for a pending vendor and medium amount", () => {
    expect(
      scoreRisk({
        ...baseInput,
        paymentRequest: {
          ...baseInput.paymentRequest,
          amountCents: 7_500,
          vendorId: "vnd_serp"
        },
        vendor: {
          id: "vnd_serp",
          status: "PENDING",
          previousApprovedRequestCount: 0
        },
        recentRequestHistory: []
      })
    ).toEqual({
      score: 45,
      level: "MEDIUM",
      signals: [
        "MEDIUM_AMOUNT",
        "PENDING_VENDOR",
        "NEW_VENDOR_FOR_AGENT"
      ]
    });
  });

  it("returns high risk for a blocked vendor with high amount and sensitive category", () => {
    expect(
      scoreRisk({
        ...baseInput,
        paymentRequest: {
          amountCents: 25_000,
          category: "Compute",
          vendorId: "vnd_compute",
          agentId: "agt_ops"
        },
        vendor: {
          id: "vnd_compute",
          status: "BLOCKED",
          previousApprovedRequestCount: 0
        },
        recentRequestHistory: [
          {
            vendorId: "vnd_compute",
            agentId: "agt_ops",
            amountCents: 18_000,
            status: "BLOCKED"
          }
        ]
      })
    ).toEqual({
      score: 100,
      level: "HIGH",
      signals: [
        "HIGH_AMOUNT",
        "BLOCKED_VENDOR",
        "SENSITIVE_CATEGORY",
        "OVER_TRANSACTION_LIMIT",
        "RECENT_BLOCKED_REQUESTS",
        "NEW_VENDOR_FOR_AGENT"
      ]
    });
  });

  it("classifies score 30 as medium", () => {
    const result = scoreRisk({
      ...baseInput,
      paymentRequest: {
        ...baseInput.paymentRequest,
        amountCents: 7_500
      },
      metadata: {
        ...baseInput.metadata,
        spentThisWeekCents: 82_500
      }
    });

    expect(result.score).toBe(30);
    expect(result.level).toBe("MEDIUM");
  });

  it("adds near weekly budget signal at 90 percent projected usage", () => {
    expect(
      scoreRisk({
        ...baseInput,
        metadata: {
          ...baseInput.metadata,
          spentThisWeekCents: 88_000
        }
      })
    ).toEqual({
      score: 15,
      level: "LOW",
      signals: ["LOW_AMOUNT", "APPROVED_VENDOR", "NEAR_WEEKLY_BUDGET"]
    });
  });

  it("adds over transaction limit signal without requiring a high amount tier", () => {
    expect(
      scoreRisk({
        ...baseInput,
        paymentRequest: {
          ...baseInput.paymentRequest,
          amountCents: 10_001
        }
      })
    ).toEqual({
      score: 35,
      level: "MEDIUM",
      signals: ["MEDIUM_AMOUNT", "APPROVED_VENDOR", "OVER_TRANSACTION_LIMIT"]
    });
  });

  it("adds recent approval signal after multiple review-routed requests", () => {
    expect(
      scoreRisk({
        ...baseInput,
        recentRequestHistory: [
          {
            vendorId: "vnd_serp",
            agentId: "agt_research",
            amountCents: 5_000,
            status: "NEEDS_APPROVAL"
          },
          {
            vendorId: "vnd_browserbase",
            agentId: "agt_research",
            amountCents: 6_000,
            status: "NEEDS_APPROVAL"
          }
        ]
      })
    ).toEqual({
      score: 10,
      level: "LOW",
      signals: ["LOW_AMOUNT", "APPROVED_VENDOR", "RECENT_APPROVAL_REQUESTS"]
    });
  });

  it("adds unusual metadata signal deterministically", () => {
    expect(
      scoreRisk({
        ...baseInput,
        metadata: {
          ...baseInput.metadata,
          hasUnusualMetadata: true
        }
      })
    ).toEqual({
      score: 10,
      level: "LOW",
      signals: ["LOW_AMOUNT", "APPROVED_VENDOR", "UNUSUAL_METADATA"]
    });
  });

  it("caps score at 100", () => {
    const result = scoreRisk({
      ...baseInput,
      paymentRequest: {
        amountCents: 50_000,
        category: "Compute",
        vendorId: "vnd_unknown",
        agentId: "agt_research"
      },
      vendor: {
        id: "vnd_unknown",
        status: "NEW",
        previousApprovedRequestCount: 0
      },
      recentRequestHistory: [
        {
          vendorId: "vnd_unknown",
          agentId: "agt_research",
          amountCents: 30_000,
          status: "BLOCKED"
        },
        {
          vendorId: "vnd_unknown",
          agentId: "agt_research",
          amountCents: 31_000,
          status: "BLOCKED"
        }
      ],
      metadata: {
        ...baseInput.metadata,
        spentThisWeekCents: 90_000,
        hasUnusualMetadata: true
      }
    });

    expect(result.score).toBe(100);
    expect(result.level).toBe("HIGH");
  });
});
