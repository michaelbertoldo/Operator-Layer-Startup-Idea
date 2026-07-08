/**
 * reserveBudget.ts — atomic, concurrency-safe budget accounting.
 *
 * THE BUG THIS FIXES:
 *   The old flow read `spentThisWeekCents`, checked it in JS, then wrote. Two
 *   requests that arrive together both read the old number, both pass the check,
 *   both execute → budget blown. Classic read-modify-write race.
 *
 * THE FIX:
 *   Never check in JS. Push the check *into the write* as a single conditional
 *   UPDATE that the database serializes with a row lock:
 *
 *     UPDATE ... SET heldCents = heldCents + :amt
 *     WHERE ... AND heldCents + :amt <= limitCents
 *
 *   If the row would exceed the limit, 0 rows are affected and we reject. Two
 *   concurrent callers can't both win, because the row lock forces them to take
 *   turns and the second one sees the first one's increment.
 *
 * card-auth mental model:
 *   reserve  = authorization hold   (money committed, outcome pending)
 *   settle   = capture              (hold becomes permanent spend)
 *   release  = void                 (rejected/failed → budget returned)
 *
 * (Python analogy: `tx.$executeRaw` ≈ `cursor.execute(sql, params)` returning
 *  rowcount; the tagged-template `Prisma.sql` is just parameterized SQL — no
 *  string interpolation, so no injection.)
 */

import { Prisma, type PrismaClient, ReservationState } from "@prisma/client";

// Accept either the base client or a transaction client, so callers can run
// this inside a larger $transaction.
type Db = PrismaClient | Prisma.TransactionClient;

export type ReserveResult =
  | { ok: true; reservationId: string; periodId: string }
  | { ok: false; reason: "BUDGET_EXCEEDED" };

/**
 * Atomically hold `amountCents` against the agent's budget period.
 * Ensures the period row exists, then does the conditional increment.
 */
export async function reserveBudget(
  db: Db,
  params: {
    agentId: string;
    periodKey: string; // e.g. "2026-W27"
    limitCents: number;
    amountCents: number;
    paymentRequestId: string;
  },
): Promise<ReserveResult> {
  const { agentId, periodKey, limitCents, amountCents, paymentRequestId } = params;

  // Upsert the period row (idempotent; keeps limit in sync if it changed).
  await db.$executeRaw`
    INSERT INTO "AgentBudgetPeriod" ("id", "agentId", "periodKey", "limitCents", "heldCents", "createdAt", "updatedAt")
    VALUES (${cuidLike()}, ${agentId}, ${periodKey}, ${limitCents}, 0, ${now()}, ${now()})
    ON CONFLICT ("agentId", "periodKey")
    DO UPDATE SET "limitCents" = ${limitCents}
  `;

  // The atomic gate. rowsAffected === 1 means the hold fit and was applied.
  const rowsAffected = await db.$executeRaw`
    UPDATE "AgentBudgetPeriod"
    SET "heldCents" = "heldCents" + ${amountCents},
        "updatedAt" = ${now()}
    WHERE "agentId" = ${agentId}
      AND "periodKey" = ${periodKey}
      AND "heldCents" + ${amountCents} <= "limitCents"
  `;

  if (rowsAffected === 0) {
    return { ok: false, reason: "BUDGET_EXCEEDED" };
  }

  const period = await db.agentBudgetPeriod.findUniqueOrThrow({
    where: { agentId_periodKey: { agentId, periodKey } },
    select: { id: true },
  });

  const reservation = await db.spendReservation.create({
    data: {
      id: `res_${crypto.randomUUID().replace(/-/g, "")}`,
      periodId: period.id,
      paymentRequestId,
      amountCents,
      state: ReservationState.HELD,
    },
    select: { id: true },
  });

  return { ok: true, reservationId: reservation.id, periodId: period.id };
}

/** Capture: the spend went through. Hold stays counted; just flip the state. */
export async function settleReservation(db: Db, reservationId: string): Promise<void> {
  await db.spendReservation.update({
    where: { id: reservationId },
    data: { state: ReservationState.SETTLED },
  });
}

/**
 * Void: rejected by a human or the vendor call failed. Give the budget back
 * atomically and flip the state. Guarded so a double-release can't over-credit.
 */
export async function releaseReservation(db: Db, reservationId: string): Promise<void> {
  const reservation = await db.spendReservation.findUniqueOrThrow({
    where: { id: reservationId },
    select: { amountCents: true, periodId: true, state: true },
  });
  if (reservation.state !== ReservationState.HELD) return; // already terminal

  await db.$executeRaw`
    UPDATE "AgentBudgetPeriod"
    SET "heldCents" = "heldCents" - ${reservation.amountCents},
        "updatedAt" = ${now()}
    WHERE "id" = ${reservation.periodId}
  `;

  await db.spendReservation.update({
    where: { id: reservationId },
    data: { state: ReservationState.RELEASED },
  });
}

// --- tiny helpers ------------------------------------------------------------
function now() {
  return new Date();
}
// Prisma normally generates ids; for the raw INSERT we need one here. In real
// code import cuid or use crypto.randomUUID(); kept inline for a single file.
function cuidLike(): string {
  return "res_" + globalThis.crypto.randomUUID().replace(/-/g, "");
}
