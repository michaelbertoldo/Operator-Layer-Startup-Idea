export type GatewayRequest = {
  agentId: string;
  vendorId: string;
  amountCents: number;
  category: string;
};

export async function requestPaidApiCall(_request: GatewayRequest) {
  throw new Error("requestPaidApiCall is not implemented yet.");
}

export async function checkRemainingBudget(_agentId: string) {
  throw new Error("checkRemainingBudget is not implemented yet.");
}

export async function requestHumanApproval(_requestId: string) {
  throw new Error("requestHumanApproval is not implemented yet.");
}

