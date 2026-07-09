/**
 * provisionCredential.ts — orchestrate the credential provisioning flow.
 *
 * This is the main entry point for OperatorLayer Connect. It:
 * 1. Loads the provider manifest
 * 2. Executes device auth (if supported)
 * 3. Returns metadata about the provisioned credential
 *
 * SECURITY: The raw token is returned to the caller but NEVER logged or
 * included in any structured response that could be serialized to an agent.
 */

import type { ProviderManifest } from "./providerManifest";
import { loadProviderManifest } from "./providerManifest";
import { executeDeviceAuth } from "./executeDeviceAuth";

export type ProvisionRequest = {
  provider: string;
  vendorId: string;
  companyId: string;
  provisionedBy: string; // agentId or userId
  scopes?: string[];
};

export type ProvisionResult = {
  ok: true;
  token: string; // Raw token - caller MUST write to vault and never expose
  metadata: {
    provider: string;
    vendorId: string;
    envVarName: string;
    scopes: string[];
    manifest: ProviderManifest;
  };
} | {
  ok: false;
  error: string;
};

/**
 * Provision a credential through device auth or manual flow.
 *
 * CRITICAL: The returned token must be immediately written to the vault
 * and never logged, printed, or included in API responses.
 */
export async function provisionCredential(
  request: ProvisionRequest,
): Promise<ProvisionResult> {
  // Load the provider manifest
  const manifest = await loadProviderManifest(request.provider);
  if (!manifest) {
    return { ok: false, error: `Unknown provider: ${request.provider}` };
  }

  // For providers with device auth, execute the CLI flow
  if (manifest.deviceAuth) {
    const authResult = await executeDeviceAuth(manifest);
    if (!authResult.ok) {
      return { ok: false, error: authResult.error };
    }

    return {
      ok: true,
      token: authResult.token,
      metadata: {
        provider: request.provider,
        vendorId: request.vendorId,
        envVarName: manifest.envVarName,
        scopes: request.scopes ?? manifest.availableScopes ?? [],
        manifest,
      },
    };
  }

  // For manual provisioning (no device auth), return instructions
  // The token will be provided through a separate secure channel
  return {
    ok: false,
    error: `Provider ${request.provider} requires manual provisioning. Visit: ${manifest.dashboardUrl}`,
  };
}
