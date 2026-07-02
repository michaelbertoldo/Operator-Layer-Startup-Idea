import { NextResponse } from "next/server";
import {
  createPaymentRequest,
  createPaymentRequestSchema
} from "@/app/api/payment-requests/service";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const agentId = url.searchParams.get("agentId");

  if (!agentId) {
    return NextResponse.json({ error: "agentId is required." }, { status: 400 });
  }

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { policy: true }
  });

  if (!agent || !agent.policy) {
    return NextResponse.json({ error: "Agent not found." }, { status: 404 });
  }

  return NextResponse.json({
    agentId: agent.id,
    weeklyBudgetCents: agent.policy.weeklyBudgetCents,
    spentThisWeekCents: agent.spentThisWeekCents,
    remainingBudgetCents: Math.max(
      0,
      agent.policy.weeklyBudgetCents - agent.spentThisWeekCents
    )
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createPaymentRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payment request input.",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const result = await createPaymentRequest(prisma, parsed.data);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}
