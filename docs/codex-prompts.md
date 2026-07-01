This is your copy/paste playbook.

# Codex Prompts

## Prompt 1: Repo setup

Read AGENTS.md, docs/product-plan.md, and docs/build-plan.md.

Create the initial monorepo for OperatorLayer Lite.

Use:

- pnpm workspaces
- apps/web as a Next.js TypeScript app
- packages/core for policy, risk, schemas, payments, and audit logic
- packages/mcp-gateway for mock MCP/API gateway logic
- docs for project documentation

Do not implement real payments.

After creating the structure, add a README with setup instructions.

Before editing, explain the implementation plan. Then make the smallest complete change.

## Prompt 2: Static dashboard

Read AGENTS.md and docs/build-plan.md.

Build the static dashboard UI with mock data.

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

Use Tailwind and shadcn/ui.

The design should feel like a polished developer SaaS dashboard.

Do not connect a database yet.

Keep business logic out of React components.

## Prompt 3: Database

Read AGENTS.md and docs/build-plan.md.

Add Prisma to the project.

Create models:

- Company
- User
- Agent
- Vendor
- Policy
- PaymentRequest
- AuditLog

Use SQLite locally unless Postgres is already configured.

Create seed data for:

- one company
- three agents
- five vendors
- policies
- payment requests
- audit logs

Update dashboard pages to read from Prisma instead of mock data.

## Prompt 4: Policy engine

Read AGENTS.md and docs/build-plan.md.

Implement packages/core/src/policy/evaluatePolicy.ts.

It must be deterministic, typed, and independent from the database.

Create unit tests with Vitest.

Rules:

- paused or disabled agents are blocked
- blocked vendors are blocked
- weekly budget overflow is blocked
- disallowed categories are blocked
- pending or new vendors require approval when policy requires it
- over-transaction-limit requests require approval
- clean requests are auto-approved

Add at least 10 unit tests.

## Prompt 5: Risk engine

Read AGENTS.md and docs/build-plan.md.

Implement packages/core/src/risk/scoreRisk.ts.

It should accept:

- payment request data
- vendor data
- recent request history
- metadata

Return:

- score from 0 to 100
- level: LOW, MEDIUM, HIGH
- signals

Keep it deterministic. Do not use AI calls.

Add unit tests for low, medium, and high risk cases.

## Prompt 6: Fake payment executor

Read AGENTS.md.

Create packages/core/src/payments/fakePaymentExecutor.ts.

It must not touch real funds or external APIs.

It should simulate a payment and return:

- fakeTransactionId
- rail: FAKE_X402
- asset: FAKE_USDC
- amountCents
- executedAt

Add tests if appropriate.

## Prompt 7: Payment request API

Read AGENTS.md and docs/build-plan.md.

Create POST /api/payment-requests.

Flow:

1. Validate input with Zod.
2. Load agent, vendor, and policy from Prisma.
3. Run evaluatePolicy.
4. Run scoreRisk.
5. Combine policy and risk decisions.
6. Create a PaymentRequest.
7. Create AuditLog rows for every step.
8. If policy auto-approves and risk is low, execute fake payment and mark EXECUTED.
9. If policy needs approval or risk is medium, mark NEEDS_APPROVAL.
10. If policy blocks or risk is high, mark BLOCKED.

Add tests or explain why tests could not be run.

## Prompt 8: Approvals page

Read AGENTS.md and docs/build-plan.md.

Build /approvals.

Show all PaymentRequest records with status NEEDS_APPROVAL.

Add approve and reject buttons.

Approve:

- execute fake payment
- mark request EXECUTED
- write audit logs

Reject:

- mark request BLOCKED
- write audit logs

Handle loading, empty, and error states.

## Prompt 9: Demo page

Read AGENTS.md, docs/product-plan.md, and docs/build-plan.md.

Build /demo as an investor demo.

Add three buttons:

1. Simulate safe request
2. Simulate new vendor request
3. Simulate dangerous request

Each button should create a real PaymentRequest through the API.

Show:

- request details
- policy decision
- risk score
- final status
- audit timeline

Make this page polished and easy to demo.

## Prompt 10: Mock MCP gateway

Read AGENTS.md and docs/build-plan.md.

Create packages/mcp-gateway.

Add functions:

- requestPaidApiCall
- checkRemainingBudget
- requestHumanApproval

For now, these can be plain TypeScript functions or a simple local server.

They should call the web app's payment request API.

Add README instructions showing how an AI developer would integrate the mock gateway.
