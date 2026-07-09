/**
 * POST /api/connect/provision — provision a third-party credential.
 *
 * Flow:
 * 1. Authenticate the requesting agent/user
 * 2. Validate the provision request
 * 3. Execute device auth (if supported by provider)
 * 4. Write encrypted credential to vault
 * 5. Append audit log entry
 * 6. Return metadata (NEVER the raw token)
 *
 * SECURITY INVARIANT:
 * The raw token exists only in memory during this request and is never
 * logged, returned in the response, or included in the audit trail.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticateAgent } from "@/lib/authenticateAgent";
import { appendAuditLog } from "@/lib/appendAuditLog";
import { provisionCredential } from "@operatorlayer/core";
import { writeVaultCredential } from "@/lib/connect/writeVaultCredential";

const ProvisionRequestSchema = z.object({
  provider: z.string().min(1),
  vendorId: z.string().min(1),
  scopes: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  // ── 1. authenticate ────────────────────────────────────────────────────────
  const agent = await authenticateAgent(prisma, req.headers.get("authorization"));
  if (!agent) {
    return NextResponse.json(
      { error: "Invalid or revoked agent key" },
      { status: 401 },
    );
  }

  // ── 2. validate request ────────────────────────────────────────────────────
  const parsed = ProvisionRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { provider, vendorId, scopes } = parsed.data;

  // Verify vendor exists and belongs to the agent's company
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, companyId: true, name: true },
  });

  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  if (vendor.companyId !== agent.companyId) {
    return NextResponse.json(
      { error: "Vendor does not belong to your company" },
      { status: 403 },
    );
  }

  // Check if credential already exists
  const existing = await prisma.provisionedCredential.findUnique({
    where: {
      companyId_vendorId: { companyId: agent.companyId, vendorId },
    },
    select: { id: true, revokedAt: true },
  });

  if (existing && !existing.revokedAt) {
    return NextResponse.json(
      { error: "Credential already provisioned for this vendor" },
      { status: 409 },
    );
  }

  // ── 3. execute device auth ─────────────────────────────────────────────────
  const provisionResult = await provisionCredential({
    provider,
    vendorId,
    companyId: agent.companyId,
    provisionedBy: agent.agentId,
    scopes,
  });

  if (!provisionResult.ok) {
    return NextResponse.json(
      { error: provisionResult.error },
      { status: 400 },
    );
  }

  const { token, metadata } = provisionResult;

  // ── 4. write to vault ──────────────────────────────────────────────────────
  // CRITICAL: token variable exists only here and is never logged/returned
  const writeResult = await writeVaultCredential(prisma, {
    companyId: agent.companyId,
    vendorId,
    provider,
    envVarName: metadata.envVarName,
    token, // Raw token - encrypted inside writeVaultCredential
    scopes: metadata.scopes,
    provisionedBy: agent.agentId,
  });

  // Token is now encrypted in the database. Clear it from memory.
  // (JavaScript doesn't have secure memory wiping, but we can at least
  // not reference it again after this point.)

  // ── 5. audit log ───────────────────────────────────────────────────────────
  await appendAuditLog(prisma, {
    companyId: agent.companyId,
    paymentRequestId: null,
    actor: agent.agentId,
    action: "CREDENTIAL_PROVISIONED",
    target: vendorId,
    detail: `Provisioned ${provider} credential for ${vendor.name}. Scopes: ${metadata.scopes.join(", ") || "none"}`,
  });

  // ── 6. return metadata (NEVER the token) ───────────────────────────────────
  return NextResponse.json({
    provisioned: true,
    credentialId: writeResult.credentialId,
    vendorId: writeResult.vendorId,
    provider: writeResult.provider,
    envVarName: writeResult.envVarName,
    scopes: metadata.scopes,
  });
}
