/**
 * operatorClient.ts
 *
 * Thin typed wrapper around OperatorLayer's decision API
 * (POST /api/payment-requests). This is the only place the MCP server talks
 * to your backend, so if the API shape changes you fix it here once.
 *
 * (Python analogy: this is your `requests.Session` with the base URL, auth
 *  header, and a couple of typed helper methods hung off it.)
 */

export type Decision = "AUTO_APPROVE" | "NEEDS_APPROVAL" | "BLOCK";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type SpendDecision = {
  paymentRequestId: string;
  decision: Decision;
  finalStatus: "EXECUTED" | "NEEDS_APPROVAL" | "BLOCKED";
  risk: { level: RiskLevel; score: number; signals: string[] };
  policyReasons: string[];
};

export type RequestSpendArgs = {
  vendorId: string;
  category: string;
  amountCents: number;
  /** free-form reason the agent gives — logged for the audit trail */
  purpose?: string;
  /** de-dupe key so a retried call never double-spends (see reserveBudget) */
  idempotencyKey: string;
};

export class OperatorClient {
  constructor(
    private readonly baseUrl: string,
    /** per-agent scoped key. Proves *which* agent is calling. */
    private readonly agentApiKey: string,
  ) {}

  private headers() {
    return {
      "content-type": "application/json",
      // The backend resolves the agent from this key. The agent id is never
      // trusted from the request body — identity is proven, not claimed.
      authorization: `Bearer ${this.agentApiKey}`,
    };
  }

  /** Ask OperatorLayer for a decision. Does NOT move money by itself. */
  async requestSpend(args: RequestSpendArgs): Promise<SpendDecision> {
    const res = await fetch(`${this.baseUrl}/api/payment-requests`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        vendorId: args.vendorId,
        category: args.category,
        amountCents: args.amountCents,
        purpose: args.purpose ?? null,
        idempotencyKey: args.idempotencyKey,
      }),
    });

    if (res.status === 401) {
      throw new Error("OperatorLayer rejected the agent API key (401).");
    }
    if (!res.ok) {
      const detail = await safeText(res);
      throw new Error(`OperatorLayer error ${res.status}: ${detail}`);
    }
    return (await res.json()) as SpendDecision;
  }

  /** Read-only budget check. Handy for the agent to plan before it commits. */
  async checkBudget(): Promise<{
    weeklyBudgetCents: number;
    heldCents: number;
    remainingCents: number;
  }> {
    const res = await fetch(`${this.baseUrl}/api/budget`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`budget check failed: ${res.status}`);
    return await res.json();
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "<no body>";
  }
}
