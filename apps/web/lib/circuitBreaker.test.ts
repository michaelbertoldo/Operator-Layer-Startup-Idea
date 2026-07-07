import { describe, expect, it } from "vitest";
import { breakerConfig, evaluateBreaker } from "./circuitBreaker";

const now = new Date("2026-07-03T12:00:00.000Z");

describe("evaluateBreaker", () => {
  it("trips after more than N blocked requests in the window", () => {
    const result = evaluateBreaker({
      now,
      currentRequestAmountCents: 100,
      maxTransactionCents: 1_000,
      reservations: [],
      recentRequests: Array.from(
        { length: breakerConfig.blockedRequestLimit + 1 },
        (_, index) => ({
          status: "Blocked",
          createdAt: new Date(now.getTime() - index * 60_000)
        })
      )
    });

    expect(result).toMatchObject({
      tripped: true,
      kind: "BLOCKED_REQUEST_BURST"
    });
  });

  it("skips spend velocity when there is no trailing baseline", () => {
    expect(
      evaluateBreaker({
        now,
        currentRequestAmountCents: 100,
        maxTransactionCents: 1_000,
        recentRequests: [],
        reservations: [
          {
            amountCents: 10_000,
            createdAt: new Date(now.getTime() - 60_000)
          }
        ]
      })
    ).toEqual({ tripped: false });
  });

  it("trips when current spend velocity exceeds the trailing baseline multiplier", () => {
    const result = evaluateBreaker({
      now,
      currentRequestAmountCents: 100,
      maxTransactionCents: 1_000,
      recentRequests: [],
      reservations: [
        {
          amountCents: 10_000,
          createdAt: new Date(now.getTime() - 60_000)
        },
        {
          amountCents: 1_000,
          createdAt: new Date(now.getTime() - 15 * 60_000)
        }
      ]
    });

    expect(result).toMatchObject({
      tripped: true,
      kind: "SPEND_VELOCITY_SPIKE"
    });
  });

  it("trips when a request exceeds the hard transaction ceiling", () => {
    const result = evaluateBreaker({
      now,
      currentRequestAmountCents:
        1_000 * breakerConfig.hardCeilingTransactionLimitMultiplier + 1,
      maxTransactionCents: 1_000,
      recentRequests: [],
      reservations: []
    });

    expect(result).toMatchObject({
      tripped: true,
      kind: "HARD_TRANSACTION_CEILING"
    });
  });
});
