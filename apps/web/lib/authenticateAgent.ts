/**
 * authenticateAgent.ts — prove *which* agent is calling.
 *
 * The old flow trusted `agentId` from the request body. Anyone could claim to
 * be any agent. Here the request carries a bearer token; we hash it and look it
 * up. `revokedAt` gives you an instant kill switch (great demo moment).
 *
 * (Python analogy: FastAPI dependency that reads the Authorization header,
 *  hashes it, and returns the Agent or raises 401.)
 */

import { createHash } from "node:crypto";

export type AuthedAgent = { agentId: string; apiKeyId: string; companyId: string };

/** Minimal DB surface — avoids coupling this module to @prisma/client. */
export type AuthenticateAgentDb = {
  agentApiKey: {
    findUnique(args: {
      where: { keyHash: string };
      select: { id: true; agentId: true; revokedAt: true; agent: { select: { companyId: true } } };
    }): Promise<{ id: string; agentId: string; revokedAt: Date | null; agent: { companyId: string } } | null>;
    update(args: {
      where: { id: string };
      data: { lastUsedAt: Date };
    }): Promise<unknown>;
  };
};

export async function authenticateAgent(
  db: AuthenticateAgentDb,
  authorizationHeader: string | null,
): Promise<AuthedAgent | null> {
  if (!authorizationHeader?.startsWith("Bearer ")) return null;
  const presented = authorizationHeader.slice("Bearer ".length).trim();
  if (!presented) return null;

  const keyHash = sha256(presented);
  const record = await db.agentApiKey.findUnique({
    where: { keyHash },
    select: { id: true, agentId: true, revokedAt: true, agent: { select: { companyId: true } } },
  });

  if (!record || record.revokedAt) return null; // unknown or killed

  // Best-effort last-used stamp; don't block the request on it.
  db.agentApiKey
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return { agentId: record.agentId, apiKeyId: record.id, companyId: record.agent.companyId };
}

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}
