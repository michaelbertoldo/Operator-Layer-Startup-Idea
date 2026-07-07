import { NextResponse } from "next/server";
import { z } from "zod";
import { appendAuditLog } from "@/lib/appendAuditLog";
import { authenticateAgent } from "@/lib/authenticateAgent";
import { prisma } from "@/lib/prisma";

const controlSchema = z.object({
  scope: z.enum(["agent", "company"]),
  action: z.enum(["freeze", "unfreeze"]),
  agentId: z.string().min(1).optional(),
  reason: z.string().min(1).max(240).optional()
});

export async function POST(request: Request) {
  const authenticatedAgent = await authenticateAgent(
    prisma,
    request.headers.get("authorization")
  );

  if (!authenticatedAgent) {
    return NextResponse.json(
      { error: "A valid agent bearer token is required." },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = controlSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid control input.",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const now = new Date();
  const reason =
    parsed.data.reason ??
    (parsed.data.action === "freeze"
      ? "Manual spend freeze."
      : "Manual spend unfreeze.");

  if (parsed.data.scope === "company") {
    const company = await prisma.company.findUnique({
      where: { id: authenticatedAgent.companyId }
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedCompany = await tx.company.update({
        where: { id: company.id },
        data:
          parsed.data.action === "freeze"
            ? {
                frozenAt: now,
                freezeReason: reason
              }
            : {
                frozenAt: null,
                freezeReason: null
              }
      });

      await appendAuditLog(tx, {
        companyId: company.id,
        actor: "manual-controls",
        action:
          parsed.data.action === "freeze"
            ? "COMPANY_FREEZE_ENABLED"
            : "COMPANY_FREEZE_CLEARED",
        target: company.id,
        detail:
          parsed.data.action === "freeze"
            ? `Company spend frozen: ${reason}`
            : `Company spend unfrozen: ${reason}`
      });

      return updatedCompany;
    });

    return NextResponse.json({
      scope: "company",
      action: parsed.data.action,
      company: result
    });
  }

  if (!parsed.data.agentId) {
    return NextResponse.json(
      { error: "agentId is required for agent controls." },
      { status: 400 }
    );
  }

  const targetAgent = await prisma.agent.findUnique({
    where: { id: parsed.data.agentId }
  });

  if (!targetAgent || targetAgent.companyId !== authenticatedAgent.companyId) {
    return NextResponse.json({ error: "Agent not found." }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedAgent = await tx.agent.update({
      where: { id: targetAgent.id },
      data:
        parsed.data.action === "freeze"
          ? {
              frozenAt: now,
              freezeReason: reason
            }
          : {
              frozenAt: null,
              freezeReason: null
            }
    });

    await appendAuditLog(tx, {
      companyId: targetAgent.companyId,
      actor: "manual-controls",
      action:
        parsed.data.action === "freeze"
          ? "AGENT_FREEZE_ENABLED"
          : "AGENT_FREEZE_CLEARED",
      target: targetAgent.id,
      detail:
        parsed.data.action === "freeze"
          ? `Agent spend frozen: ${reason}`
          : `Agent spend unfrozen: ${reason}`
    });

    return updatedAgent;
  });

  return NextResponse.json({
    scope: "agent",
    action: parsed.data.action,
    agent: result
  });
}
