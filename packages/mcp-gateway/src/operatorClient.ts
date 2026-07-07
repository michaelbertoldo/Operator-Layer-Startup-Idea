import { CredentialVault } from "./credentialVault";

export type GatewayRequest = {
  agentId: string;
  vendorId: string;
  amountCents: number;
  category: string;
  metadata?: {
    hasUnusualMetadata?: boolean;
    sensitiveCategories?: string[];
  };
};

export type GatewayOptions = {
  baseUrl?: string;
  credentialVault?: CredentialVault;
  fetcher?: typeof fetch;
  idempotencyKey?: string;
};

export type PaidApiCallResult = {
  paymentRequest: {
    id: string;
    status: string;
    policyDecision: string;
    riskLevel: string;
    riskScore: number;
    fakeTransactionId: string | null;
  };
  policyResult: {
    decision: string;
    reasons: string[];
  };
  riskResult: {
    score: number;
    level: string;
    signals: string[];
  };
  fakePayment: {
    fakeTransactionId: string;
    rail: "FAKE_X402";
    asset: "FAKE_USDC";
    amountCents: number;
    executedAt: string;
  } | null;
  auditLogs: Array<{
    id: string;
    actor: string;
    action: string;
    detail: string;
    createdAt: string;
  }>;
};

export type RemainingBudgetResult = {
  agentId: string;
  weeklyBudgetCents: number;
  spentThisWeekCents: number;
  remainingBudgetCents: number;
};

export type HumanApprovalRequest = {
  requestId: string;
  approvalUrl: string;
  message: string;
};

const defaultBaseUrl = "http://localhost:3000";

export class OperatorLayerClient {
  private readonly baseUrl: string;
  private readonly credentialVault: CredentialVault | null;
  private readonly fetcher: typeof fetch;

  constructor(options: GatewayOptions = {}) {
    this.baseUrl = (options.baseUrl ?? defaultBaseUrl).replace(/\/$/, "");
    this.credentialVault = options.credentialVault ?? null;
    this.fetcher = options.fetcher ?? fetch;
  }

  async requestPaidApiCall(
    request: GatewayRequest,
    options: Pick<GatewayOptions, "idempotencyKey"> = {}
  ): Promise<PaidApiCallResult> {
    const headers = this.createHeaders(request.agentId, options.idempotencyKey);

    const response = await this.fetcher(`${this.baseUrl}/api/payment-requests`, {
      method: "POST",
      headers,
      body: JSON.stringify(request)
    });

    return parseJsonResponse<PaidApiCallResult>(response);
  }

  async checkRemainingBudget(agentId: string): Promise<RemainingBudgetResult> {
    const url = new URL(`${this.baseUrl}/api/payment-requests`);
    url.searchParams.set("agentId", agentId);

    const response = await this.fetcher(url, {
      headers: this.createHeaders(agentId)
    });

    return parseJsonResponse<RemainingBudgetResult>(response);
  }

  async requestHumanApproval(requestId: string): Promise<HumanApprovalRequest> {
    return {
      requestId,
      approvalUrl: `${this.baseUrl}/approvals`,
      message: `Payment request ${requestId} requires human authorization in OperatorLayer Lite.`
    };
  }

  private createHeaders(agentId?: string, idempotencyKey?: string) {
    const headers = new Headers({
      "Content-Type": "application/json"
    });

    if (agentId && this.credentialVault) {
      const credential = this.credentialVault.getAgentCredential(agentId);

      if (credential) {
        headers.set("Authorization", `Bearer ${credential.apiKey}`);
      }
    }

    if (idempotencyKey) {
      headers.set("Idempotency-Key", idempotencyKey);
    }

    return headers;
  }
}

export async function requestPaidApiCall(
  request: GatewayRequest,
  options: GatewayOptions = {}
): Promise<PaidApiCallResult> {
  return new OperatorLayerClient(options).requestPaidApiCall(request, options);
}

export async function checkRemainingBudget(
  agentId: string,
  options: GatewayOptions = {}
): Promise<RemainingBudgetResult> {
  return new OperatorLayerClient(options).checkRemainingBudget(agentId);
}

export async function requestHumanApproval(
  requestId: string,
  options: GatewayOptions = {}
): Promise<HumanApprovalRequest> {
  return new OperatorLayerClient(options).requestHumanApproval(requestId);
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json();

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `OperatorLayer API request failed with status ${response.status}.`;

    throw new Error(message);
  }

  return payload as T;
}
