import { describe, expect, it } from "vitest";
import { fakePaymentExecutor } from "./fakePaymentExecutor";

describe("fakePaymentExecutor", () => {
  it("simulates a payment on the fake rail and fake asset", () => {
    const executedAt = new Date("2026-07-02T12:00:00.000Z");

    expect(
      fakePaymentExecutor({
        paymentRequestId: "req_1042",
        amountCents: 4_200,
        executedAt
      })
    ).toEqual({
      fakeTransactionId: "fake_txn_req_1042",
      rail: "FAKE_X402",
      asset: "FAKE_USDC",
      amountCents: 4_200,
      executedAt
    });
  });

  it("creates deterministic fake transaction ids from request ids", () => {
    const first = fakePaymentExecutor({
      paymentRequestId: " req_1041 ",
      amountCents: 7_600,
      executedAt: new Date("2026-07-02T12:00:00.000Z")
    });

    const second = fakePaymentExecutor({
      paymentRequestId: "req_1041",
      amountCents: 7_600,
      executedAt: new Date("2026-07-02T12:01:00.000Z")
    });

    expect(first.fakeTransactionId).toBe("fake_txn_req_1041");
    expect(second.fakeTransactionId).toBe("fake_txn_req_1041");
  });

  it("uses the current time when no execution timestamp is provided", () => {
    const result = fakePaymentExecutor({
      paymentRequestId: "req_now",
      amountCents: 1
    });

    expect(result.executedAt).toBeInstanceOf(Date);
  });

  it("allows zero-cent simulated payments", () => {
    expect(
      fakePaymentExecutor({
        paymentRequestId: "req_zero",
        amountCents: 0,
        executedAt: new Date("2026-07-02T12:00:00.000Z")
      }).amountCents
    ).toBe(0);
  });

  it("rejects negative amounts", () => {
    expect(() =>
      fakePaymentExecutor({
        paymentRequestId: "req_negative",
        amountCents: -1
      })
    ).toThrow("amountCents must be a non-negative integer.");
  });

  it("rejects fractional cent amounts", () => {
    expect(() =>
      fakePaymentExecutor({
        paymentRequestId: "req_fractional",
        amountCents: 10.5
      })
    ).toThrow("amountCents must be a non-negative integer.");
  });

  it("requires a payment request id", () => {
    expect(() =>
      fakePaymentExecutor({
        paymentRequestId: " ",
        amountCents: 100
      })
    ).toThrow("paymentRequestId is required.");
  });
});

