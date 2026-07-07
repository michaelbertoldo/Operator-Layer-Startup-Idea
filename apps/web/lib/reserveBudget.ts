import { ReservationState, type Prisma } from "@prisma/client";
import { isoWeekKey } from "@/lib/isoWeekKey";

type ReserveBudgetInput = {
  agentId: string;
  amountCents: number;
  weeklyBudgetCents: number;
  now?: Date;
  ttlMs?: number;
};

export async function reserveBudget(
  tx: Prisma.TransactionClient,
  input: ReserveBudgetInput
) {
  const now = input.now ?? new Date();
  const periodKey = isoWeekKey(now);

  const budgetPeriod = await tx.agentBudgetPeriod.upsert({
    where: {
      agentId_periodKey: {
        agentId: input.agentId,
        periodKey
      }
    },
    create: {
      id: `abp_${crypto.randomUUID()}`,
      agentId: input.agentId,
      periodKey,
      budgetCents: input.weeklyBudgetCents,
      spentCents: 0,
      reservedCents: 0
    },
    update: {
      budgetCents: input.weeklyBudgetCents
    }
  });

  const availableCents =
    budgetPeriod.budgetCents -
    budgetPeriod.spentCents -
    budgetPeriod.reservedCents;

  if (input.amountCents > availableCents) {
    return {
      ok: false as const,
      reason: "INSUFFICIENT_BUDGET",
      availableCents
    };
  }

  const reservation = await tx.spendReservation.create({
    data: {
      id: `res_${crypto.randomUUID()}`,
      agentId: input.agentId,
      budgetPeriodId: budgetPeriod.id,
      amountCents: input.amountCents,
      state: ReservationState.ACTIVE,
      expiresAt: new Date(now.getTime() + (input.ttlMs ?? 10 * 60 * 1000))
    }
  });

  await tx.agentBudgetPeriod.update({
    where: { id: budgetPeriod.id },
    data: {
      reservedCents: {
        increment: input.amountCents
      }
    }
  });

  return {
    ok: true as const,
    reservation
  };
}

