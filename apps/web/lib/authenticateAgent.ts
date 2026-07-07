import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export type AuthenticatedAgent = {
  id: string;
  companyId: string;
  status: string;
};

export async function authenticateAgent(
  prisma: PrismaClient,
  authorizationHeader: string | null
): Promise<AuthenticatedAgent | null> {
  const token = extractBearerToken(authorizationHeader);

  if (!token) {
    return null;
  }

  const keyHash = hashApiKey(token);
  const apiKey = await prisma.agentApiKey.findUnique({
    where: { keyHash },
    include: {
      agent: true
    }
  });

  if (!apiKey || apiKey.revokedAt) {
    return null;
  }

  await prisma.agentApiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() }
  });

  return {
    id: apiKey.agent.id,
    companyId: apiKey.agent.companyId,
    status: apiKey.agent.status
  };
}

export function hashApiKey(apiKey: string) {
  return createHash("sha256").update(apiKey).digest("hex");
}

function extractBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

