# OperatorLayer Lite MCP Gateway

This package is a mock MCP/API gateway for AI developers integrating with OperatorLayer Lite.

It does not move real funds, connect to wallets, or store private keys. It calls the local web app's fake-money payment request API.

## Usage

```ts
import {
  checkRemainingBudget,
  requestHumanApproval,
  requestPaidApiCall
} from "@operatorlayer/mcp-gateway";

const result = await requestPaidApiCall({
  agentId: "agt_research",
  vendorId: "vnd_clearbit",
  amountCents: 1200,
  category: "Data enrichment"
});

if (result.paymentRequest.status === "Needs approval") {
  const approval = await requestHumanApproval(result.paymentRequest.id);
  console.log(approval.approvalUrl);
}

const budget = await checkRemainingBudget("agt_research");
console.log(budget.remainingBudgetCents);
```

## Local Setup

Run the web app first:

```bash
corepack pnpm dev
```

By default, the gateway calls:

```text
http://localhost:3000
```

Use `baseUrl` when the web app runs somewhere else:

```ts
await requestPaidApiCall(request, {
  baseUrl: "http://localhost:3001"
});
```

## Functions

- `requestPaidApiCall(request, options)`: posts to `POST /api/payment-requests`.
- `checkRemainingBudget(agentId, options)`: reads budget state through `GET /api/payment-requests?agentId=...`.
- `requestHumanApproval(requestId, options)`: returns the local approvals page URL for a pending request.

