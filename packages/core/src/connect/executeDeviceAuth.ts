/**
 * executeDeviceAuth.ts — shell out to provider CLIs for device-auth flows.
 *
 * CRITICAL SECURITY INVARIANT:
 * The raw token value is captured from CLI stdout and returned ONLY to the
 * calling function. It must NEVER be logged, printed, or included in any
 * response that an AI agent could observe.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { ProviderManifest } from "./providerManifest";

const execAsync = promisify(exec);

export type DeviceAuthResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

/**
 * Execute a provider's CLI device-auth flow.
 *
 * @param manifest - Provider manifest with deviceAuth configuration
 * @returns The extracted token or an error. Token is NOT logged or exposed.
 */
export async function executeDeviceAuth(
  manifest: ProviderManifest,
): Promise<DeviceAuthResult> {
  if (!manifest.deviceAuth) {
    return { ok: false, error: "Provider does not support CLI device auth" };
  }

  const { command, args, tokenPath } = manifest.deviceAuth;

  try {
    // Execute the CLI command
    const fullCommand = [command, ...args].join(" ");
    const { stdout, stderr } = await execAsync(fullCommand, {
      timeout: 120000, // 2 minutes timeout for auth flow
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    // Parse JSON output
    let output: unknown;
    try {
      output = JSON.parse(stdout);
    } catch {
      // If not JSON, treat stdout as the raw token
      const token = stdout.trim();
      if (!token) {
        return { ok: false, error: "CLI returned empty output" };
      }
      return { ok: true, token };
    }

    // Extract token using the configured path
    const token = extractTokenFromPath(output, tokenPath);
    if (!token) {
      return {
        ok: false,
        error: `Failed to extract token from path: ${tokenPath}`,
      };
    }

    return { ok: true, token };
  } catch (err) {
    const error = err as Error & { code?: string; stderr?: string };

    // SECURITY: Do not include stdout/stderr in error message as they might contain tokens
    if (error.code === "ETIMEDOUT") {
      return { ok: false, error: "CLI command timed out after 2 minutes" };
    }

    return {
      ok: false,
      error: `CLI execution failed: ${error.message}`,
    };
  }
}

/**
 * Extract a value from a nested object using a dot-notation path.
 * E.g., "auth.token" extracts obj.auth.token
 */
function extractTokenFromPath(obj: unknown, path: string): string | null {
  const parts = path.split(".");
  let current: any = obj;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }

  if (typeof current === "string" && current.trim()) {
    return current.trim();
  }

  return null;
}
