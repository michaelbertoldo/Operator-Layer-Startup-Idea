/**
 * credentialVault.ts
 *
 * THE WHOLE POINT of OperatorLayer as a *firewall* (not a suggestion box):
 * the agent never holds the real vendor API key. OperatorLayer does.
 *
 * Flow:
 *   1. Agent calls our MCP tool `request_spend`.
 *   2. We ask the OperatorLayer decision API "is this allowed?".
 *   3. ONLY if approved do we reach into the vault, pull the vendor's real
 *      credential, and make the paid call on the agent's behalf.
 *   4. The agent gets the *result*, never the key.
 *
 * That inversion is the moat: an agent physically cannot overspend, because it
 * never possesses the thing needed to spend.
 *
 * (Python analogy: think of this as a dict of secrets you os.environ-style look
 *  up by vendor id. In production this is Vault / AWS Secrets Manager / KMS —
 *  never a plaintext map like the placeholder below.)
 */

export type VendorCredential = {
  /** e.g. "Authorization" — the header the vendor expects */
  header: string;
  /** e.g. "Bearer sk-live-..." — the secret value, injected at call time */
  value: string;
  /** base URL we proxy the paid call to */
  baseUrl: string;
};

export interface CredentialVault {
  get(vendorId: string): Promise<VendorCredential | null>;
}

/**
 * Dev-only in-memory vault. Reads secrets from env so nothing lands in git.
 * Swap this class for a real secrets backend before you touch a real key.
 */
export class EnvCredentialVault implements CredentialVault {
  async get(vendorId: string): Promise<VendorCredential | null> {
    // Convention: OL_VENDOR_<ID>_URL / _HEADER / _VALUE
    const prefix = `OL_VENDOR_${vendorId.toUpperCase()}_`;
    const baseUrl = process.env[`${prefix}URL`];
    const header = process.env[`${prefix}HEADER`] ?? "Authorization";
    const value = process.env[`${prefix}VALUE`];
    if (!baseUrl || !value) return null;
    return { baseUrl, header, value };
  }
}
