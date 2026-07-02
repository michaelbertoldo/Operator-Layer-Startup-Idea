export type FakePaymentRail = "FAKE_X402";
export type FakePaymentAsset = "FAKE_USDC";

export type FakePaymentExecutorInput = {
  paymentRequestId: string;
  amountCents: number;
  executedAt?: Date;
};

export type FakePaymentExecutorResult = {
  fakeTransactionId: string;
  rail: FakePaymentRail;
  asset: FakePaymentAsset;
  amountCents: number;
  executedAt: Date;
};

export function fakePaymentExecutor(
  input: FakePaymentExecutorInput
): FakePaymentExecutorResult {
  if (!Number.isInteger(input.amountCents) || input.amountCents < 0) {
    throw new Error("amountCents must be a non-negative integer.");
  }

  return {
    fakeTransactionId: createFakeTransactionId(input.paymentRequestId),
    rail: "FAKE_X402",
    asset: "FAKE_USDC",
    amountCents: input.amountCents,
    executedAt: input.executedAt ?? new Date()
  };
}

function createFakeTransactionId(paymentRequestId: string) {
  const normalizedId = paymentRequestId.trim();

  if (!normalizedId) {
    throw new Error("paymentRequestId is required.");
  }

  return `fake_txn_${normalizedId}`;
}

