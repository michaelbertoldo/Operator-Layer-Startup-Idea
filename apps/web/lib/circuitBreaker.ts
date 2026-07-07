export const breakerConfig = {
  blockedRequestLimit: 3,
  blockedWindowMinutes: 10,
  velocityWindowMinutes: 10,
  velocityBaselineMultiplier: 3,
  hardCeilingTransactionLimitMultiplier: 4
} as const;

export type BreakerPaymentRequest = {
  status: string;
  createdAt: Date;
};

export type BreakerReservation = {
  amountCents: number;
  createdAt: Date;
};

export type EvaluateBreakerInput = {
  now?: Date;
  currentRequestAmountCents: number;
  maxTransactionCents: number;
  recentRequests: BreakerPaymentRequest[];
  reservations: BreakerReservation[];
};

export type BreakerTrip =
  | {
      tripped: false;
    }
  | {
      tripped: true;
      kind:
        | "BLOCKED_REQUEST_BURST"
        | "SPEND_VELOCITY_SPIKE"
        | "HARD_TRANSACTION_CEILING";
      detail: string;
    };

export function evaluateBreaker(input: EvaluateBreakerInput): BreakerTrip {
  const now = input.now ?? new Date();
  const blockedWindowStart = minutesAgo(now, breakerConfig.blockedWindowMinutes);
  const blockedRequestCount = input.recentRequests.filter(
    (request) =>
      request.status === "Blocked" && request.createdAt >= blockedWindowStart
  ).length;

  if (blockedRequestCount > breakerConfig.blockedRequestLimit) {
    return {
      tripped: true,
      kind: "BLOCKED_REQUEST_BURST",
      detail: `${blockedRequestCount} blocked requests in ${breakerConfig.blockedWindowMinutes} minutes.`
    };
  }

  const hardCeiling =
    input.maxTransactionCents *
    breakerConfig.hardCeilingTransactionLimitMultiplier;

  if (input.currentRequestAmountCents > hardCeiling) {
    return {
      tripped: true,
      kind: "HARD_TRANSACTION_CEILING",
      detail: `Request amount ${input.currentRequestAmountCents} cents exceeded hard ceiling ${hardCeiling} cents.`
    };
  }

  const velocityWindowStart = minutesAgo(now, breakerConfig.velocityWindowMinutes);
  const trailingWindowStart = minutesAgo(
    velocityWindowStart,
    breakerConfig.velocityWindowMinutes
  );
  const currentVelocityCents = sumReservations(
    input.reservations.filter(
      (reservation) => reservation.createdAt >= velocityWindowStart
    )
  );
  const trailingBaselineCents = sumReservations(
    input.reservations.filter(
      (reservation) =>
        reservation.createdAt >= trailingWindowStart &&
        reservation.createdAt < velocityWindowStart
    )
  );

  if (
    trailingBaselineCents > 0 &&
    currentVelocityCents >
      trailingBaselineCents * breakerConfig.velocityBaselineMultiplier
  ) {
    return {
      tripped: true,
      kind: "SPEND_VELOCITY_SPIKE",
      detail: `Spend velocity ${currentVelocityCents} cents exceeded ${breakerConfig.velocityBaselineMultiplier}x trailing baseline ${trailingBaselineCents} cents.`
    };
  }

  return { tripped: false };
}

function minutesAgo(date: Date, minutes: number) {
  return new Date(date.getTime() - minutes * 60 * 1000);
}

function sumReservations(reservations: BreakerReservation[]) {
  return reservations.reduce(
    (total, reservation) => total + reservation.amountCents,
    0
  );
}
