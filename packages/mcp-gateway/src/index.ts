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
  fetcher?: typeof fetch;
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

export async function requestPaidApiCall(
  request: GatewayRequest,
  options: GatewayOptions = {}
): Promise<PaidApiCallResult> {
  const response = await getFetcher(options)(
    `${getBaseUrl(options)}/api/payment-requests`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request)
    }
  );

  return parseJsonResponse<PaidApiCallResult>(response);
}

export async function checkRemainingBudget(
  agentId: string,
  options: GatewayOptions = {}
): Promise<RemainingBudgetResult> {
  const url = new URL(`${getBaseUrl(options)}/api/payment-requests`);
  url.searchParams.set("agentId", agentId);

  const response = await getFetcher(options)(url);

  return parseJsonResponse<RemainingBudgetResult>(response);
}

export async function requestHumanApproval(
  requestId: string,
  options: GatewayOptions = {}
): Promise<HumanApprovalRequest> {
  const approvalUrl = `${getBaseUrl(options)}/approvals`;

  return {
    requestId,
    approvalUrl,
    message: `Payment request ${requestId} requires human authorization in OperatorLayer Lite.`
  };
}

function getBaseUrl(options: GatewayOptions) {
  return (options.baseUrl ?? defaultBaseUrl).replace(/\/$/, "");
}

function getFetcher(options: GatewayOptions) {
  return options.fetcher ?? fetch;
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

