# OperatorLayer Lite Build Plan

## Phase 1: Static dashboard

Create a polished SaaS dashboard with mock data.

Pages:

- Dashboard
- Agents
- Policies
- Vendors
- Requests
- Approvals
- Audit
- Demo
- Settings

## Phase 2: Database

Add Prisma.

Models:

- Company
- User
- Agent
- Vendor
- Policy
- PaymentRequest
- AuditLog

Use seed data.

## Phase 3: Policy engine

Create packages/core/src/policy/evaluatePolicy.ts.

Inputs:

- agent status
- amount
- max transaction limit
- weekly budget
- spent this week
- vendor status
- category
- allowed categories
- require approval for new vendor

Outputs:

- AUTO_APPROVE
- NEEDS_APPROVAL
- BLOCK

Rules:

- paused or disabled agent: block
- blocked vendor: block
- weekly budget overflow: block
- disallowed category: block
- pending vendor with approval required: needs approval
- over transaction limit: needs approval
- clean request: auto approve

## Phase 4: Risk engine

Create packages/core/src/risk/scoreRisk.ts.

Inputs:

- payment request
- vendor data
- request history
- metadata

Outputs:

- score from 0 to 100
- level: LOW, MEDIUM, HIGH
- signals

Risk levels:

- 0-29: low
- 30-69: medium
- 70-100: high

## Phase 5: Fake payment executor

Create packages/core/src/payments/fakePaymentExecutor.ts.

It should return:

- fake transaction id
- fake rail
- fake asset
- amount
- timestamp

No real funds. No external APIs.

## Phase 6: Payment request API

Create POST /api/payment-requests.

Flow:

1. Validate input with Zod.
2. Load agent, vendor, and policy.
3. Run policy engine.
4. Run risk engine.
5. Combine policy and risk decision.
6. Create PaymentRequest.
7. Create AuditLog records.
8. If auto-approved and low risk, execute fake payment.
9. Return result.

## Phase 7: Approvals

Create /approvals.

Show requests with NEEDS_APPROVAL.

Actions:

- approve
- reject

Approve:

- execute fake payment
- mark request EXECUTED
- write audit log

Reject:

- mark request BLOCKED
- write audit log

## Phase 8: Demo page

Create /demo.

Buttons:

- Simulate safe request
- Simulate new vendor request
- Simulate dangerous request

Each button should create a real PaymentRequest through the API and show:

- policy decision
- risk result
- final status
- audit timeline

## Phase 9: Mock MCP gateway

Create packages/mcp-gateway.

Functions:

- requestPaidApiCall
- checkRemainingBudget
- requestHumanApproval

The mock gateway should call the web app payment request API.
