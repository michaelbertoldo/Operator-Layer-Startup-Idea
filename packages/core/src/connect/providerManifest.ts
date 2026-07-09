/**
 * providerManifest.ts — type-safe provider configuration for OperatorLayer Connect.
 *
 * Each provider manifest describes how to provision a third-party API credential
 * through a device-auth flow or manual input, without the AI agent ever seeing
 * the raw secret value.
 */

export type ProviderManifest = {
  /** Provider identifier (e.g. "railway", "anthropic") */
  provider: string;

  /** Human-readable provider name (e.g. "Railway", "Anthropic") */
  displayName: string;

  /** Environment variable name where the credential should be stored */
  envVarName: string;

  /** Type of credential this provider uses */
  keyType: "single-token" | "client-id-secret" | "api-key";

  /** Base URL for the provider's API */
  baseUrl: string;

  /** Default HTTP header name for authentication */
  authHeader: string;

  /** Available scopes/permissions for this provider (optional) */
  availableScopes?: string[];

  /** URL to the provider's dashboard/console for manual key creation */
  dashboardUrl: string;

  /** CLI device-auth configuration (if supported) */
  deviceAuth?: {
    /** CLI command to execute (e.g. "railway", "anthropic") */
    command: string;

    /** Arguments to pass to the command (e.g. ["login", "--json"]) */
    args: string[];

    /** JSON path to extract the token from CLI output (e.g. "token" or "auth.apiKey") */
    tokenPath: string;
  };

  /** Instructions shown to the user during provisioning */
  instructions: string;
};

/**
 * Load a provider manifest by provider ID.
 */
export async function loadProviderManifest(
  provider: string,
): Promise<ProviderManifest | null> {
  try {
    // Dynamic import of JSON manifests
    const manifest = await import(`../providers/${provider}.json`);
    return manifest.default as ProviderManifest;
  } catch {
    return null;
  }
}

/**
 * List all available providers.
 */
export function listProviders(): string[] {
  return ["railway", "anthropic"];
}
