/**
 * writeVaultCredential.ts — write provisioned credentials to the database.
 *
 * SECURITY CRITICAL:
 * - Accepts the raw token value
 * - Encrypts it immediately
 * - Stores encrypted value in database
 * - Returns ONLY metadata (no token)
 * - Token never appears in logs, responses, or audit trail
 */

import type { PrismaClient } from "@prisma/client";
import { encryptCredential } from "./encryption";

export type WriteCredentialInput = {
  companyId: string;
  vendorId: string;
  provider: string;
  envVarName: string;
  token: string; // Raw token - will be encrypted
  scopes?: string[];
  provisionedBy: string; // agentId or userId
};

export type WriteCredentialResult = {
  credentialId: string;
  vendorId: string;
  envVarName: string;
  provider: string;
};

/**
 * Write a provisioned credential to the vault (database).
 *
 * CRITICAL: The `token` parameter is the only place the raw value exists
 * in memory. It is immediately encrypted and never returned.
 */
export async function writeVaultCredential(
  db: PrismaClient,
  input: WriteCredentialInput,
): Promise<WriteCredentialResult> {
  // Encrypt the token immediately
  const { encryptedValue, iv } = encryptCredential(input.token);

  // Store in database with encrypted value
  const credential = await db.provisionedCredential.create({
    data: {
      id: `cred_${crypto.randomUUID().replace(/-/g, "")}`,
      companyId: input.companyId,
      vendorId: input.vendorId,
      provider: input.provider,
      envVarName: input.envVarName,
      encryptedValue,
      encryptionIv: iv,
      scopes: input.scopes ? JSON.stringify(input.scopes) : null,
      provisionedBy: input.provisionedBy,
    },
    select: {
      id: true,
      vendorId: true,
      envVarName: true,
      provider: true,
    },
  });

  // Return ONLY metadata - no token
  return {
    credentialId: credential.id,
    vendorId: credential.vendorId,
    envVarName: credential.envVarName,
    provider: credential.provider,
  };
}

/**
 * Read a credential from the vault and decrypt it.
 * Used by the credential vault when making proxied API calls.
 */
export async function readVaultCredential(
  db: PrismaClient,
  companyId: string,
  vendorId: string,
): Promise<{ token: string; envVarName: string } | null> {
  const credential = await db.provisionedCredential.findUnique({
    where: {
      companyId_vendorId: { companyId, vendorId },
    },
    select: {
      encryptedValue: true,
      encryptionIv: true,
      envVarName: true,
      revokedAt: true,
    },
  });

  if (!credential || credential.revokedAt) {
    return null;
  }

  const { decryptCredential } = await import("./encryption");
  const token = decryptCredential(
    credential.encryptedValue,
    credential.encryptionIv,
  );

  return {
    token,
    envVarName: credential.envVarName,
  };
}
